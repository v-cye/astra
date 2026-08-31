import csv
import json
from pathlib import Path


TOOLS_DIR = Path(__file__).parent
DATA_DIR = TOOLS_DIR.parent / "data"

SOURCE_FILES = [
    TOOLS_DIR / "NGC.csv",
    TOOLS_DIR / "addendum.csv"
]

OUTPUT_FILE = DATA_DIR / "deep-sky.json"

MAGNITUDE_LIMIT = 12.0


def parse_float(value):
    if not value:
        return None

    try:
        return float(value)
    except ValueError:
        return None


objects = []


for source_file in SOURCE_FILES:
    with source_file.open(
        "r",
        encoding="utf-8",
        newline=""
    ) as file:

        reader = csv.DictReader(file, delimiter=";")

        for row in reader:
            ra = row.get("RA")
            dec = row.get("Dec")

            if not ra or not dec:
                continue

            magnitude = parse_float(
                row.get("V-Mag")
            )

            messier = row.get("M") or None

            # Keep all Messier objects.
            # Otherwise keep reasonably bright objects.
            if (
                not messier
                and magnitude is not None
                and magnitude > MAGNITUDE_LIMIT
            ):
                continue

            # If there is no Messier ID AND no usable magnitude,
            # skip it for V1.
            if not messier and magnitude is None:
                continue

            obj = {
                "name": row.get("Name") or None,
                "type": row.get("Type") or None,

                "ra": ra,
                "dec": dec,

                "magnitude": magnitude,

                "messier": messier,
                "ngc": row.get("NGC") or None,
                "ic": row.get("IC") or None,

                "constellation": row.get("Const") or None,

                "majorAxis": parse_float(
                    row.get("MajAx")
                ),

                "minorAxis": parse_float(
                    row.get("MinAx")
                ),

                "positionAngle": parse_float(
                    row.get("PosAng")
                )
            }

            objects.append(obj)


DATA_DIR.mkdir(
    parents=True,
    exist_ok=True
)


with OUTPUT_FILE.open(
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        objects,
        file,
        separators=(",", ":")
    )


print(f"Created {OUTPUT_FILE}")
print(f"Deep-sky objects included: {len(objects)}")