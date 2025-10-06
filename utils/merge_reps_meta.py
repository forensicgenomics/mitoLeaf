# This file is part of the mitoLEAF (formerly mitoTree) project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoLEAF.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

###############################
#
# This script merges the representatives as well as the metadata from the different sources
# (ncbi, empop, 1k_genomes)
#
################################


import os
import warnings
import re
import pandas as pd
from pathlib import Path

from utils.path_defaults import (OUTPUT_DIR,
                                 MOTIF_REPRESENTATIVES,
                                 METADATA_REPRESENTATIVES,
                                 INPUT_DIR,
                                 PIPELINE_LOG_FILE)

### defaults ###
# path matching for sources
_rep_rx  = re.compile(r"(.+)_representatives\.csv$", re.IGNORECASE)
_meta_rx = re.compile(r"(.+)_metadata\.csv$", re.IGNORECASE)
# format matching for input files
# allowed meta columns
_META_ALLOWED = {
    "accession","pub_title","first_aut","pubmed_id","pub_date",
    "geo_origin","asm_method","seq_tech", "source"
}
# two valid reps schemas
_REPS_SCHEMA = {
    "motif","profiles"
}


def _norm_acc(x):
    # keep version suffixes like .1 but strip trailing +
    return str(x).strip().rstrip('+')


def _split_profiles(x):
    if pd.isna(x) or x == "":
        return []
    return [_norm_acc(tok) for tok in str(x).split()]


def warn_preview_and_log_full(*, source: str | None, issue: str, items, unit: str = "items", preview_n: int = 5, log_path: str | None = None):
    """
    Console: warnings.warn with up to preview_n examples.
    Logfile: writes the full list (one per line) to WARN_LOG_PATH or provided log_path.
    """
    items = list(items)
    if not items:
        return
    items_sorted = list(map(str, sorted(items)))
    preview = ", ".join(items_sorted[:preview_n])
    prefix = f"source '{source}': " if source is not None else ""

    # console preview
    warnings.warn(f"{prefix}{len(items)} {issue} (e.g., {preview}...)")

    # full list to logfile
    path = log_path or PIPELINE_LOG_FILE
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(f"{prefix}{issue} — total {len(items)} {unit}:\n")
            for it in items_sorted:
                f.write(f"{it}\n")


def load_sources(directory):
    """
    return (reps, meta, sources)
       reps/meta: dict[str, pd.DataFrame] for sources that have both files
       sources: list[str] of source names that had a complete pair
    """
    reps_files, meta_files = {}, {}
    dirpath = Path(directory)

    # files that match
    for f in dirpath.glob("*.csv"):
        m = _rep_rx.match(f.name)
        if m:
            reps_files[m.group(1)] = f
            continue
        m = _meta_rx.match(f.name)
        if m:
            meta_files[m.group(1)] = f

    # check completeness
    rep_only  = sorted(set(reps_files) - set(meta_files))
    meta_only = sorted(set(meta_files) - set(reps_files))
    if rep_only:
        warn_preview_and_log_full(source=None,
                                  issue="sources missing _metadata.csv",
                                  items=rep_only, unit="sources")
    if meta_only:
        warn_preview_and_log_full(source=None,
                                  issue="sources missing _representatives.csv",
                                  items=meta_only, unit="sources")

    complete_sources = sorted(set(reps_files) & set(meta_files))

    # read only complete pairs
    reps, meta = {}, {}
    for s in complete_sources:
        reps[s] = pd.read_csv(reps_files[s])
        meta[s] = pd.read_csv(meta_files[s])

    return reps, meta, complete_sources


def validate_and_filter(reps, meta, sources):
    """
    returns (reps_ok, meta_ok, valid_sources)
    - excludes sources if reps missing required cols or meta missing 'accession'
    - warns about unexpected meta columns and missing optional 'num_profiles'
    """
    reps_ok, meta_ok, valid = {}, {}, []

    for s in sources:
        r_df = reps.get(s)
        m_df = meta.get(s)

        # reps: need 'motif' and 'profiles'
        r_cols = list(r_df.columns)
        if not _REPS_SCHEMA.issubset(r_cols):
            missing = sorted(_REPS_SCHEMA - set(r_cols))
            warn_preview_and_log_full(source=s,
                                      issue="representatives missing required columns",
                                      items=missing, unit="columns")
            continue

        # meta: need 'accession'
        m_cols = set(m_df.columns)
        if "accession" not in m_cols:
            warn_preview_and_log_full(
                source=s,
                issue="meta missing required column — excluding source",
                items=["accession"],
                unit="column",
            )
            continue

        # warn on unexpected meta columns and remove them
        unexpected = sorted(m_cols - _META_ALLOWED)
        if unexpected:
            warn_preview_and_log_full(source=s,
                                      issue="meta has unexpected columns (dropping)",
                                      items=unexpected, unit="columns")
        m_df = m_df.drop(unexpected, axis=1)

        # keep source
        reps_ok[s] = r_df
        meta_ok[s] = m_df
        valid.append(s)

    return reps_ok, meta_ok, valid


def load_and_validate(directory):
    reps, meta, sources = load_sources(directory)  # from previous step
    return validate_and_filter(reps, meta, sources)


def merge_motif_into_meta(reps, meta, sources, log_file=None):
    """
    for each source:
      - create 'motif' column in meta by looking up accession membership in reps['profiles']
      - drop meta rows with no matching accession in reps
      - if an accession appears under multiple motifs in reps, warn and drop those rows from meta
    returns (merged, kept_sources)
    """
    merged = {}

    for s in sources:
        r_df = reps[s]
        m_df = meta[s].copy()

        # remove possible trailing +
        m_df["accession"] = m_df["accession"].astype(str).map(_norm_acc)

        # accession -> motif map
        acc_to_motif = {}
        conflicts = set()
        for _, row in r_df.iterrows():
            motif = row["motif"]
            for acc in _split_profiles(row["profiles"]):
                # if already mapped, check consistency
                if acc in acc_to_motif and acc_to_motif[acc] != motif:
                    conflicts.add(acc)
                else:
                    acc_to_motif.setdefault(acc, motif)

        if conflicts:
            warn_preview_and_log_full(
                source=s,
                issue="accessions belong to multiple motifs — dropping these profiles",
                items=conflicts,
                unit="accessions",
            )

        conflict_mask = m_df["accession"].isin(conflicts)

        # check rep accession not found in meta
        reps_acc = {a for lst in r_df["profiles"].map(_split_profiles) for a in lst}
        meta_acc = set(m_df["accession"].astype(str))
        reps_missing_in_meta = sorted(reps_acc - meta_acc)
        if reps_missing_in_meta:
            warn_preview_and_log_full(
                source=s,
                issue="accessions referenced in representatives but not found in meta — ignored",
                items=reps_missing_in_meta,
                unit="accessions",
            )

        # add motif col to meta df
        m_df["motif"] = m_df["accession"].map(acc_to_motif)

        # missing motifs
        no_match_mask = m_df["motif"].isna()
        n_no_match = int(no_match_mask.sum())
        if n_no_match:
            nomatch = m_df.loc[no_match_mask, "accession"].astype(str).tolist()
            warn_preview_and_log_full(
                source=s,
                issue="meta accessions not found in representatives — dropping",
                items=nomatch,
                unit="accessions",
            )

        keep_mask = ~(no_match_mask | conflict_mask)
        m_df = m_df.loc[keep_mask].reset_index(drop=True)

        merged[s] = m_df

    return merged


def merge_sources(motif_meta: dict):
    """
    motif_meta: dict[source -> df] (df includes 'accession' and 'motif')
    returns a single df with a 'source' column, duplicates dropped on `dedup_on`
    warns if duplicate accessions have conflicting motif values
    """
    parts = []
    for s, df in motif_meta.items():
        tmp = df.copy()
        tmp["source"] = s
        parts.append(tmp)

    if not parts:
        return pd.DataFrame()

    all_meta = pd.concat(parts, ignore_index=True)

    # duplicate accessions
    dedup_on = "accession"
    if "motif" in all_meta.columns:
        conflicts = (all_meta.groupby(dedup_on)["motif"]
                             .nunique(dropna=False)
                             .reset_index())
        conflicts = conflicts[conflicts["motif"] > 1][dedup_on].astype(str).tolist()
        if conflicts:
            warn_preview_and_log_full(
                source=None,
                issue=f"{dedup_on} values have conflicting motif across sources — keeping first occurrence",
                items=conflicts,
                unit="accessions",
            )

    # drop duplicates, keep first occurrence
    dup_mask = all_meta.duplicated(subset=[dedup_on], keep="first")
    dropped_vals = all_meta.loc[dup_mask, dedup_on].astype(str).tolist()
    if dropped_vals:
        warn_preview_and_log_full(
            source=None,
            issue=f"duplicate rows on '{dedup_on}' (kept first) — dropped",
            items=dropped_vals,
            unit="accessions",
        )

    all_meta = all_meta.drop_duplicates(subset=[dedup_on], keep="first").reset_index(drop=True)

    return all_meta


def write_split_df(df: pd.DataFrame, target_path_prefix: str | None = None, *,
                   reps_path: str | None = None, meta_path: str | None = None):
    """
    Split a single merged df into representatives + metadata CSVs.

    If reps_path/meta_path are provided, they are used directly.
    Otherwise, target_path_prefix is required and files are written to:
      {prefix}_representatives.csv and {prefix}_metadata.csv

    Returns dict with written file paths.
    """
    if reps_path or meta_path:
        if not (reps_path and meta_path):
            raise ValueError("provide both reps_path and meta_path, or neither")
    else:
        if not target_path_prefix:
            raise ValueError("either provide target_path_prefix or both reps_path and meta_path")
        reps_path = f"{target_path_prefix}_representatives.csv"
        meta_path = f"{target_path_prefix}_metadata.csv"

    # for the rep file, group accessions by motif
    g = (df.assign(accession=df["accession"].astype(str))
           .groupby("motif", sort=False)["accession"]
           .apply(list)
           .reset_index(name="profiles_list"))

    reps_out = pd.DataFrame({
        "motif": g["motif"],
        "num_profiles": g["profiles_list"].map(len),
        "profiles": g["profiles_list"].map(lambda lst: " ".join(lst)),
    })

    # for metafile,remove motif col
    meta_cols = [c for c in df.columns if c in _META_ALLOWED]
    meta_out = df[meta_cols].copy()

    reps_out.to_csv(reps_path, index=False)
    meta_out.to_csv(meta_path, index=False)

    return reps_path, meta_path


def main():

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    # clear logfile
    open(PIPELINE_LOG_FILE, 'w').close()

    # check for sources in inputfiles
    reps, meta, sources = load_and_validate(INPUT_DIR)
    print(f"Loaded Representatives and Metadata from the following {len(sources)} sources: {sources}.")

    # check same profiles in both files and merge info
    print("Performing Accession match check ...")
    motif_meta = merge_motif_into_meta(reps, meta, sources, log_file=PIPELINE_LOG_FILE)
    print("Completed Accession match check.")

    # combine the reps
    print("Merging Profiles and Meta from all sources ...")
    merged_motif_meta = merge_sources(motif_meta)
    print(f"Number of merged profiles: {len(merged_motif_meta)}.")

    # write to formatted files
    print(f"Writing target files to {OUTPUT_DIR} ...")
    # indiv
    for s in sources:
        r_p, m_p = write_split_df(motif_meta[s], target_path_prefix=os.path.join(OUTPUT_DIR, s))
        print(f"Wrote {r_p} and {m_p} for source {s}.")
    # combined
    r_p, m_p = write_split_df(merged_motif_meta,
                              reps_path=MOTIF_REPRESENTATIVES,
                              meta_path=METADATA_REPRESENTATIVES
                             )
    print(f"Wrote combined to:\n  reps: {r_p}\n  meta: {m_p}")

    print("Processing source inputfiles complete!")


if __name__ == "__main__":
    main()
