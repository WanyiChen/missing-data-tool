from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os
import pandas as pd
import io
import json
import numpy as np

app = FastAPI()

# Import routers from new modules
from routes.validation_routes import router as validation_router
from routes.dashboard_routes import router as dashboard_router
from routes.features_routes import router as features_router

app.include_router(validation_router)
app.include_router(dashboard_router)
app.include_router(features_router)
