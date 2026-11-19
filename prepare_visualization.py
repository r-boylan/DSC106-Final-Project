
import os
import json
import urllib.request
import numpy as np
import pandas as pd
from matplotlib.path import Path

os.makedirs("data", exist_ok=True)

df = pd.read_csv("data/aod_annual.csv")

url = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
geojson_file = "data/world.geojson"

if not os.path.exists(geojson_file):
    urllib.request.urlretrieve(url, geojson_file)

with open(geojson_file) as f:
    world = json.load(f)

map_df = df[
    (df["latitude"] % 2 == 0.5)
    & (df["longitude"] % 2 == 0.5)
][["year", "latitude", "longitude", "aod"]].copy()

map_df.to_csv("data/aod_map.csv", index=False)

grid = df[["longitude", "latitude"]].drop_duplicates()
points = grid.to_numpy()
grid_index = pd.MultiIndex.from_frame(grid)

records = []

for feature in world["features"]:
    name = feature["properties"]["name"]
    geometry = feature["geometry"]

    if geometry["type"] == "Polygon":
        polygons = [geometry["coordinates"]]
    elif geometry["type"] == "MultiPolygon":
        polygons = geometry["coordinates"]
    else:
        continue

    mask = np.zeros(len(points), dtype=bool)

    for polygon in polygons:
        outer = np.asarray(polygon[0])
        inside = Path(outer).contains_points(points)

        for hole in polygon[1:]:
            inside &= ~Path(np.asarray(hole)).contains_points(points)

        mask |= inside

    selected_grid = grid.loc[mask]

    if selected_grid.empty:
        continue

    selected_index = pd.MultiIndex.from_frame(selected_grid)

    subset = df[
        pd.MultiIndex.from_frame(
            df[["longitude", "latitude"]]
        ).isin(selected_index)
    ]

    yearly = subset.groupby("year")["aod"].mean()

    for year, aod in yearly.items():
        if pd.notna(aod):
            records.append({
                "country": name,
                "year": int(year),
                "aod": round(float(aod), 4)
            })

    print(f"Processed {name}")

regions_df = pd.DataFrame(records)
regions_df = regions_df.sort_values(["country", "year"])
regions_df.to_csv("data/aod_regions.csv", index=False)

print("\nProcessing complete!")
print(f"Map rows: {len(map_df):,}")
print(f"Countries: {regions_df['country'].nunique()}")
print(f"Regional rows: {len(regions_df):,}")
print("Saved data/aod_map.csv")
print("Saved data/aod_regions.csv")
