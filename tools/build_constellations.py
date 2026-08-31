import json
from pathlib import Path


TOOLS_DIR = Path(__file__).parent
DATA_DIR = TOOLS_DIR.parent / "data"

SOURCE_FILE = TOOLS_DIR / "western_constellations.json"
OUTPUT_FILE = DATA_DIR / "constellations.json"


with SOURCE_FILE.open(
    "r",
    encoding="utf-8"
) as file:
    source = json.load(file)


constellations = []


for constellation in source.get("constellations", []):
    iau = constellation.get("iau")
    lines = constellation.get("lines", [])

    if not iau or not lines:
        continue

    segments = []

    for path in lines:

        # Stellarium can put "thin" / "bold"
        # at the beginning of a path.
        hip_numbers = [
            value
            for value in path
            if isinstance(value, int)
        ]

        # Convert a path:
        # [1, 2, 3, 4]
        #
        # into segments:
        # [1,2], [2,3], [3,4]
        for i in range(len(hip_numbers) - 1):
            segments.append([
                hip_numbers[i],
                hip_numbers[i + 1]
            ])

    if segments:
        constellations.append({
            "id": iau,
            "segments": segments
        })


DATA_DIR.mkdir(
    parents=True,
    exist_ok=True
)


with OUTPUT_FILE.open(
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        constellations,
        file,
        separators=(",", ":")
    )


print(f"Created {OUTPUT_FILE}")
print(f"Constellations included: {len(constellations)}")
print(
    "Segments included:",
    sum(len(c["segments"]) for c in constellations)
)