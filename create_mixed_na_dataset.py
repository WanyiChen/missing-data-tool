import pandas as pd
import numpy as np
import random

# Read the original file
df = pd.read_csv('Test_Datasets/NA_water_potability.csv', keep_default_na=False)

# Different NA variations to use
na_variations = ['N/A', 'n/a', 'NA', 'na', 'NULL', 'null', 'None', 'none', 'NaN', 'nan']

# Replace N/A values with random variations
for col in df.columns:
    mask = df[col] == 'N/A'
    if mask.any():
        # Replace each N/A with a random variation
        df.loc[mask, col] = [random.choice(na_variations) for _ in range(mask.sum())]

# Save the mixed version
df.to_csv('Test_Datasets/NA_mixed_water_potability.csv', index=False)
print("Created mixed NA file with variations:", set(na_variations))