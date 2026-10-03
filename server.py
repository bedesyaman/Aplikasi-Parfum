from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import logging
import os
import uuid

import bcrypt
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AromaForm API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger("aromaform")

DEMO_EMAIL = "studio@aromaform.app"
DEMO_PASSWORD = "AromaForm123!"


class UserOut(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None


class AuthResponse(BaseModel):
    session_token: str
    user: UserOut


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=80)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class SessionBody(BaseModel):
    session_id: str


class IngredientCreate(BaseModel):
    name: str
    casNumber: Optional[str] = None
    supplier: Optional[str] = None
    category: str
    noteType: str
    volatilityRate: Optional[str] = None
    costPerGram: float = Field(ge=0)
    ifraLimitPercentage: Optional[float] = Field(default=None, ge=0)
    dropWeightGrams: float = Field(default=0.05, gt=0, le=1)
    flashPoint: Optional[float] = None


class IngredientOut(IngredientCreate):
    id: str
    createdDate: str


class FormulaItem(BaseModel):
    id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:10]}")
    ingredientId: str
    weightGrams: float = Field(gt=0)
    dilutionPercentage: float = Field(default=100, ge=0, le=100)


class FormulaCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    version: str = Field(default="v1.0", max_length=30)
    targetConcentration: float = Field(default=18, ge=0, le=100)
    items: List[FormulaItem] = Field(default_factory=list)
    notes: Optional[str] = None


class FormulaOut(FormulaCreate):
    id: str
    createdDate: str
    updatedDate: str


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def user_public(doc: Dict[str, Any]) -> UserOut:
    return UserOut(
        user_id=doc["user_id"],
        email=doc["email"],
        name=doc.get("name") or doc["email"].split("@")[0],
        picture=doc.get("picture"),
    )


def password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def password_matches(password: str, stored: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8"))
    except (ValueError, TypeError):
        return False


async def issue_session(user: Dict[str, Any]) -> AuthResponse:
    token = f"af_{uuid.uuid4().hex}{uuid.uuid4().hex[:8]}"
    now = utc_now()
    session_doc = {
        "session_token": token,
        "user_id": user["user_id"],
        "created_at": now,
        "expires_at": now + timedelta(days=7),
    }
    await db.user_sessions.insert_one(session_doc)
    return AuthResponse(session_token=token, user=user_public(user))


async def get_current_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Session expired")
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= utc_now():
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def seed_database() -> None:
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.ingredients.create_index("id", unique=True)
    await db.formulas.create_index([("user_id", 1), ("updatedDate", -1)])

    demo = await db.users.find_one({"email": DEMO_EMAIL}, {"_id": 0})
    if not demo:
        demo = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": DEMO_EMAIL,
            "name": "AromaForm Studio",
            "password_hash": password_hash(DEMO_PASSWORD),
            "created_at": utc_now(),
        }
        await db.users.insert_one(demo)

    samples = [
        {"name": "Bergamot", "casNumber": "8007-75-8", "supplier": "Maison Naturals", "category": "Citrus", "noteType": "Top", "volatilityRate": "High", "costPerGram": 12500, "ifraLimitPercentage": 0.4, "flashPoint": 50, "dropWeightGrams": 0.05},
        {"name": "Hedione", "casNumber": "24851-98-7", "supplier": "Aroma Materials Co.", "category": "Floral", "noteType": "Heart", "volatilityRate": "Medium", "costPerGram": 4200, "ifraLimitPercentage": 100, "flashPoint": 110, "dropWeightGrams": 0.05},
        {"name": "Iso E Super", "casNumber": "54464-57-2", "supplier": "Aroma Materials Co.", "category": "Woody", "noteType": "Heart", "volatilityRate": "Medium", "costPerGram": 2800, "ifraLimitPercentage": 100, "flashPoint": 93, "dropWeightGrams": 0.05},
        {"name": "Ambroxan", "casNumber": "6790-58-5", "supplier": "Fine Fragrance Lab", "category": "Ambery", "noteType": "Base", "volatilityRate": "Low", "costPerGram": 9800, "ifraLimitPercentage": 10, "flashPoint": 160, "dropWeightGrams": 0.045},
        {"name": "Cedarwood", "casNumber": "8000-27-9", "supplier": "Maison Naturals", "category": "Woody", "noteType": "Base", "volatilityRate": "Low", "costPerGram": 5600, "ifraLimitPercentage": 20, "flashPoint": 88, "dropWeightGrams": 0.05},
    ]
    ingredient_ids: Dict[str, str] = {}
    for sample in samples:
        existing = await db.ingredients.find_one({"name": sample["name"]}, {"_id": 0})
        if existing:
            ingredient_ids[sample["name"]] = existing["id"]
            # Migrate legacy records: USD-scale costs -> IDR, backfill gram-per-drop factor.
            updates: Dict[str, Any] = {}
            if existing.get("costPerGram", 0) < 100:
                updates["costPerGram"] = sample["costPerGram"]
            if "dropWeightGrams" not in existing:
                updates["dropWeightGrams"] = sample["dropWeightGrams"]
            if updates:
                await db.ingredients.update_one({"id": existing["id"]}, {"$set": updates})
            continue
        ingredient_id = f"ing_{uuid.uuid4().hex[:12]}"
        ingredient_ids[sample["name"]] = ingredient_id
        doc = {**sample, "id": ingredient_id, "createdDate": utc_now().isoformat()}
        await db.ingredients.insert_one(doc)

    existing_formula = await db.formulas.find_one({"user_id": demo["user_id"], "title": "Velvet Cedar"}, {"_id": 0})
    if not existing_formula:
        now = utc_now().isoformat()
        sample_formula = {
            "id": f"formula_{uuid.uuid4().hex[:12]}",
            "user_id": demo["user_id"],
            "title": "Velvet Cedar",
            "version": "v1.0",
            "createdDate": now,
            "updatedDate": now,
            "targetConcentration": 18,
            "items": [
                {"id": f"item_{uuid.uuid4().hex[:10]}", "ingredientId": ingredient_ids["Bergamot"], "weightGrams": 1, "dilutionPercentage": 100},
                {"id": f"item_{uuid.uuid4().hex[:10]}", "ingredientId": ingredient_ids["Hedione"], "weightGrams": 2, "dilutionPercentage": 100},
                {"id": f"item_{uuid.uuid4().hex[:10]}", "ingredientId": ingredient_ids["Iso E Super"], "weightGrams": 3, "dilutionPercentage": 100},
                {"id": f"item_{uuid.uuid4().hex[:10]}", "ingredientId": ingredient_ids["Ambroxan"], "weightGrams": 1.5, "dilutionPercentage": 100},
                {"id": f"item_{uuid.uuid4().hex[:10]}", "ingredientId": ingredient_ids["Cedarwood"], "weightGrams": 1.5, "dilutionPercentage": 100},
            ],
            "notes": "A soft, mineral cedar study with a radiant floral heart.",
        }
        await db.formulas.insert_one(sample_formula)


@app.on_event("startup")
async def startup() -> None:
    await seed_database()


@api_router.get("/")
async def root() -> Dict[str, str]:
    return {"message": "AromaForm API"}


@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterBody) -> AuthResponse:
    email = str(body.email).lower()
    if await db.users.find_one({"email": email}, {"_id": 0}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}",
        "email": email,
        "name": body.name.strip(),
        "password_hash": password_hash(body.password),
        "created_at": utc_now(),
    }
    await db.users.insert_one(user)
    return await issue_session(user)


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginBody) -> AuthResponse:
    user = await db.users.find_one({"email": str(body.email).lower()}, {"_id": 0})
    if not user or not password_matches(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    return await issue_session(user)


@api_router.post("/auth/session", response_model=AuthResponse)
async def google_session(body: SessionBody) -> AuthResponse:
    try:
        async with httpx.AsyncClient(timeout=12) as http:
            response = await http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
            )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Google session could not be verified")
        remote = response.json()
        email = str(remote.get("email", "")).lower()
        if not email:
            raise HTTPException(status_code=401, detail="Google account email missing")
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if not user:
            user = {
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": email,
                "name": remote.get("name") or email.split("@")[0],
                "picture": remote.get("picture"),
                "created_at": utc_now(),
            }
            await db.users.insert_one(user)
        else:
            user["name"] = remote.get("name") or user.get("name")
            user["picture"] = remote.get("picture") or user.get("picture")
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"name": user["name"], "picture": user.get("picture")}})
        return await issue_session(user)
    except httpx.HTTPError:
        raise HTTPException(status_code=401, detail="Google session could not be verified")


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: Dict[str, Any] = Depends(get_current_user)) -> UserOut:
    return user_public(user)


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(default=None)) -> Dict[str, bool]:
    if authorization and authorization.lower().startswith("bearer "):
        await db.user_sessions.delete_one({"session_token": authorization.split(" ", 1)[1].strip()})
    return {"ok": True}


@api_router.get("/ingredients", response_model=List[IngredientOut])
async def list_ingredients(
    search: Optional[str] = None,
    note_type: Optional[str] = None,
    category: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user),
) -> List[IngredientOut]:
    query: Dict[str, Any] = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if note_type:
        query["noteType"] = note_type
    if category:
        query["category"] = category
    docs = await db.ingredients.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return [IngredientOut(**doc) for doc in docs]


@api_router.post("/ingredients", response_model=IngredientOut)
async def create_ingredient(body: IngredientCreate, user: Dict[str, Any] = Depends(get_current_user)) -> IngredientOut:
    doc = body.model_dump()
    doc.update({"id": f"ing_{uuid.uuid4().hex[:12]}", "createdDate": utc_now().isoformat()})
    await db.ingredients.insert_one(doc)
    return IngredientOut(**doc)


@api_router.get("/formulas", response_model=List[FormulaOut])
async def list_formulas(user: Dict[str, Any] = Depends(get_current_user)) -> List[FormulaOut]:
    docs = await db.formulas.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).sort("updatedDate", -1).to_list(200)
    return [FormulaOut(**doc) for doc in docs]


@api_router.get("/formulas/{formula_id}", response_model=FormulaOut)
async def get_formula(formula_id: str, user: Dict[str, Any] = Depends(get_current_user)) -> FormulaOut:
    doc = await db.formulas.find_one({"id": formula_id, "user_id": user["user_id"]}, {"_id": 0, "user_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Formula not found")
    return FormulaOut(**doc)


@api_router.post("/formulas", response_model=FormulaOut)
async def create_formula(body: FormulaCreate, user: Dict[str, Any] = Depends(get_current_user)) -> FormulaOut:
    now = utc_now().isoformat()
    doc = body.model_dump()
    doc.update({"id": f"formula_{uuid.uuid4().hex[:12]}", "user_id": user["user_id"], "createdDate": now, "updatedDate": now})
    await db.formulas.insert_one(doc)
    response_doc = {key: value for key, value in doc.items() if key != "user_id"}
    return FormulaOut(**response_doc)


@api_router.put("/formulas/{formula_id}", response_model=FormulaOut)
async def update_formula(formula_id: str, body: FormulaCreate, user: Dict[str, Any] = Depends(get_current_user)) -> FormulaOut:
    now = utc_now().isoformat()
    values = body.model_dump()
    values["updatedDate"] = now
    result = await db.formulas.update_one({"id": formula_id, "user_id": user["user_id"]}, {"$set": values})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Formula not found")
    doc = await db.formulas.find_one({"id": formula_id, "user_id": user["user_id"]}, {"_id": 0, "user_id": 0})
    return FormulaOut(**doc)


def next_version(version: str) -> str:
    """v1.0 -> v1.1, v2 -> v3.0; unparseable versions get a .1 suffix."""
    parts = version.strip().lstrip("vV").split(".")
    try:
        if len(parts) == 1:
            return f"v{int(parts[0]) + 1}.0"
        parts[-1] = str(int(parts[-1]) + 1)
        return "v" + ".".join(parts)
    except ValueError:
        return f"{version}.1"


@api_router.post("/formulas/{formula_id}/duplicate", response_model=FormulaOut)
async def duplicate_formula(formula_id: str, as_version: bool = False, user: Dict[str, Any] = Depends(get_current_user)) -> FormulaOut:
    original = await db.formulas.find_one({"id": formula_id, "user_id": user["user_id"]}, {"_id": 0, "user_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Formula not found")
    now = utc_now().isoformat()
    title = original["title"] if as_version else f"{original['title']} Copy"
    version = next_version(str(original.get("version", "v1.0"))) if as_version else "v1.0"
    duplicate = {**original, "id": f"formula_{uuid.uuid4().hex[:12]}", "title": title, "version": version, "createdDate": now, "updatedDate": now, "user_id": user["user_id"]}
    await db.formulas.insert_one(duplicate)
    return FormulaOut(**{key: value for key, value in duplicate.items() if key != "user_id"})


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()