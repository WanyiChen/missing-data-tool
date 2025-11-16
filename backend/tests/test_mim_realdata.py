import sys
import os
import pandas as pd
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.models.feature_missingness_bh_2 import run_selective_mim


def test_informative_missingness_on_real_data():

    BASE_DIR = os.path.dirname(__file__)
    DATA_PATH = os.path.join(BASE_DIR, "sample_data", "collision_crash_2019_2023.csv")

    df = pd.read_csv(DATA_PATH)
    df.columns = df.columns.str.strip()
    
    target_col = "fatal_or_susp_serious_inj"
    target_type = "categorical"
    
    df = df[df[target_col].notnull()]
    
    if "automobile_count" in df.columns:
        df["automobile_count"] = df["automobile_count"].mask(
            (df[target_col] == 1) & (np.random.rand(len(df)) < 0.6)
        )
    if "belted_susp_serious_inj_count" in df.columns:
        df["belted_susp_serious_inj_count"] = df["belted_susp_serious_inj_count"].mask(
            (df[target_col] == 1) & (np.random.rand(len(df)) < 0.5)
        )
    
    for col in df.columns:
        if col != target_col and df[col].dtype != 'O':
            df[col] = df[col].mask(np.random.rand(len(df)) < 0.1)
    
    results = run_selective_mim(df, target_col, target_type)
    
    assert any(r["is_informative"] for r in results), "No informative features detected"
