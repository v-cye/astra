import csv
import json
from pathlib import Path


SOURCE_FILE = Path(__file__).parent / "hygdata_v41.csv"

OUTPUT_FILE = (
    Path(__file__).parent.parent
    / "data"
    / "stars.json"
)

MAGNITUDE_LIMIT = 6.5


stars = []


with SOURCE_FILE.open(
    "r",
    encoding="utf-8",
    newline=""
) as file:

    reader = csv.DictReader(file)

    for row in reader:

        try:
            magnitude = float(row["mag"])
            ra = float(row["ra"])
            dec = float(row["dec"])

        except (ValueError, TypeError):
            continue


        if magnitude > MAGNITUDE_LIMIT:
            continue

        if row["proper"] == "Sol":
            continue

        star = {
            "hip": int(row["hip"])
                if row["hip"]
                else None,

            "name": row["proper"]
                or row["bf"]
                or None,

            "ra": ra,
            "dec": dec,
            "magnitude": magnitude,

            "pmRA": float(row["pmra"])
                if row["pmra"]
                else None,

            "pmDec": float(row["pmdec"])
                if row["pmdec"]
                else None,

            "spectralType": row["spect"]
                or None,

            "colorIndex": float(row["ci"])
                if row["ci"]
                else None,

            "constellation": row["con"]
                or None
        }

        stars.append(star)


stars.sort(
    key=lambda star: star["magnitude"]
)


OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)


with OUTPUT_FILE.open(
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        stars,
        file,
        separators=(",", ":")
    )


print(
    f"Created {OUTPUT_FILE}"
)

print(
    f"Stars included: {len(stars)}"
)