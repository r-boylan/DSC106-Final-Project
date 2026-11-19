
import os
import glob
import re
import numpy as np
import pandas as pd
from pyhdf.SD import SD, SDC

files = sorted(glob.glob("data/raw/**/*.hdf", recursive=True))
variable_name = "Aerosol_Optical_Depth_Land_Ocean_Mean_Mean"
yearly_data = {}

print(f"Found {len(files)} files")

for file in files:
    match = re.search(r"\.A(\d{4})(\d{3})\.", os.path.basename(file))
    if not match:
        continue

    year = int(match.group(1))
    if not 2003 <= year <= 2024:
        continue

    hdf = None
    try:
        hdf = SD(file, SDC.READ)
        variable = hdf.select(variable_name)
        raw = variable[:].astype(float)
        attrs = variable.attributes()

        low, high = attrs["valid_range"]
        valid = (
            (raw != attrs["_FillValue"])
            & (raw >= low)
            & (raw <= high)
        )

        aod = np.where(
            valid,
            (raw - attrs["add_offset"]) * attrs["scale_factor"],
            np.nan
        )

        if aod.shape != (180, 360):
            raise ValueError("Unexpected grid shape")

        yearly_data.setdefault(year, []).append(aod)
        print(f"Processed {os.path.basename(file)}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if hdf is not None:
            hdf.end()

latitudes = np.arange(89.5, -90, -1)
longitudes = np.arange(-179.5, 180, 1)
lon_grid, lat_grid = np.meshgrid(longitudes, latitudes)

records = []

for year, monthly in sorted(yearly_data.items()):
    stacked = np.stack(monthly)
    counts = np.sum(np.isfinite(stacked), axis=0)
    sums = np.nansum(stacked, axis=0)

    annual = np.full((180, 360), np.nan)
    np.divide(sums, counts, out=annual, where=counts > 0)

    valid = np.isfinite(annual)

    records.append(pd.DataFrame({
        "year": year,
        "latitude": lat_grid[valid],
        "longitude": lon_grid[valid],
        "aod": annual[valid].round(4),
        "months_observed": counts[valid]
    }))

    print(f"{year}: {len(monthly)} months processed")

if not records:
    raise RuntimeError("No valid AOD data found")

df = pd.concat(records, ignore_index=True)
df = df.sort_values(["year", "latitude", "longitude"])

os.makedirs("data", exist_ok=True)
df.to_csv("data/aod_annual.csv", index=False)

print("\nProcessing complete!")
print(f"Total rows: {len(df):,}")
print(f"Years: {df.year.min()}–{df.year.max()}")
print(df.head())
