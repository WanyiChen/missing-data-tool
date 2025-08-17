from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os
import pandas as pd
import io
import json

app = FastAPI()

# Import routers from new modules
from routes.validation_routes import router as validation_router
from routes.dashboard_routes import router as dashboard_router
from routes.features_routes import router as features_router
from routes.delete_missing_routes import router as delete_missing_router

app.include_router(validation_router)
app.include_router(dashboard_router)
app.include_router(features_router)
app.include_router(delete_missing_router)