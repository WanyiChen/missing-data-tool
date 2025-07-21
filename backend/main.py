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

app.include_router(validation_router)
app.include_router(dashboard_router)