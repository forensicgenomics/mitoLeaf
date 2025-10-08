import os
import pandas as pd
from pandas.api.types import is_list_like

from utils.path_defaults import (OLD_DAT,
                                 MOTIF_REPRESENTATIVES,
                                 METADATA_REPRESENTATIVES,
                                 DIFF_CHECK_DIR)


OLD_REPS = os.path.join(OLD_DAT, "reps.csv")
OLD_META = os.path.join(OLD_DAT, "meta.csv")
NEW_REPS = MOTIF_REPRESENTATIVES
NEW_META = METADATA_REPRESENTATIVES



# temp helpers to fix errors in compares
# maybe fix for a nicer solution
def _ensure_dir(d): os.makedirs(d, exist_ok=True)

def _read_csv_as_str(path: str) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, low_memory=False)

def _norm_acc(x: str) -> str:
    return str(x).strip().rstrip('+')

def _norm_profiles_as_set(s) -> set:
    if pd.isna(s) or s is None or s == "":
        return set()
    return { _norm_acc(tok) for tok in str(s).split() }

def _norm_scalar(v):
    return None if (not is_list_like(v) and pd.isna(v)) else (str(v) if not is_list_like(v) else v)


def _diff_by_key(old_df, new_df, key, *, as_set_cols=None):
    """
    Return dict: {added, removed, changed}; changed has rows [key, column, old, new].
    Compares everything as strings, except columns listed in as_set_cols which compare as sets of tokens.
    """
    as_set_cols = set(as_set_cols or [])
    old = old_df.copy()
    new = new_df.copy()
    if key not in old.columns or key not in new.columns:
        raise ValueError(f"key '{key}' must exist in both dataframes")
    old = old.set_index(key, drop=False)
    new = new.set_index(key, drop=False)

    old_keys, new_keys = set(old.index), set(new.index)
    added_keys   = sorted(new_keys - old_keys)
    removed_keys = sorted(old_keys - new_keys)
    common_keys  = sorted(old_keys & new_keys)

    added   = new.loc[added_keys].reset_index(drop=True)   if added_keys else pd.DataFrame(columns=new.columns)
    removed = old.loc[removed_keys].reset_index(drop=True) if removed_keys else pd.DataFrame(columns=old.columns)

    changed_rows = []
    if common_keys:
        all_cols = sorted(set(old.columns) | set(new.columns))
        old_al = old.reindex(columns=all_cols).loc[common_keys]
        new_al = new.reindex(columns=all_cols).loc[common_keys]

        for k in common_keys:
            o = old_al.loc[k]
            n = new_al.loc[k]
            for col in all_cols:
                if col == key:
                    continue
                ov, nv = o.get(col), n.get(col)

                if col in as_set_cols:
                    ov_cmp, nv_cmp = _norm_profiles_as_set(ov), _norm_profiles_as_set(nv)
                else:
                    ov_cmp, nv_cmp = _norm_scalar(ov), _norm_scalar(nv)

                if (ov_cmp is None) and (nv_cmp is None):
                    continue
                if ov_cmp != nv_cmp:
                    changed_rows.append({ key: k, "column": col, "old": ov, "new": nv })

    changed = pd.DataFrame(changed_rows, columns=[key, "column", "old", "new"])
    return {"added": added, "removed": removed, "changed": changed}


def diff_metadata(old_path: str, new_path: str, out_dir: str):
    _ensure_dir(out_dir)
    old = _read_csv_as_str(old_path)
    new = _read_csv_as_str(new_path)

    dup_old = old.loc[old.duplicated(subset=["accession"], keep=False), "accession"].astype(str).unique().tolist()
    if dup_old:
        print(f"[meta diff] duplicate accessions in OLD (keeping first): "
              + ", ".join(dup_old[:10]) + (" ..." if len(dup_old) > 10 else ""))
        old = old.drop_duplicates(subset=["accession"], keep="first")

    dup_new = new.loc[new.duplicated(subset=["accession"], keep=False), "accession"].astype(str).unique().tolist()
    if dup_new:
        print(f"[meta diff] duplicate accessions in NEW (keeping first): "
              + ", ".join(dup_new[:10]) + (" ..." if len(dup_new) > 10 else ""))
        new = new.drop_duplicates(subset=["accession"], keep="first")

    diffs = _diff_by_key(old, new, key="accession")
    diffs["added"].to_csv(os.path.join(out_dir, "meta_added.csv"), index=False)
    diffs["removed"].to_csv(os.path.join(out_dir, "meta_removed.csv"), index=False)
    diffs["changed"].to_csv(os.path.join(out_dir, "meta_changed.csv"), index=False)
    return diffs



def diff_reps_profiles(old_path: str, new_path: str, out_dir: str):
    """
    Focus on profile membership:
      - profiles_added: in new but not in old (with new motif)
      - profiles_removed: in old but not in new (with old motif)
      - profiles_moved: in both but motif changed (old -> new)
    Also writes per-motif adds/removes summaries.
    """
    _ensure_dir(out_dir)
    old = _read_csv_as_str(old_path)
    new = _read_csv_as_str(new_path)

    def _map_profile_to_motif(df: pd.DataFrame) -> dict:
        p2m = {}
        for _, row in df.iterrows():
            motif = row["motif"]
            for acc in _norm_profiles_as_set(row.get("profiles")):
                p2m[acc] = motif
        return p2m

    old_p2m = _map_profile_to_motif(old)
    new_p2m = _map_profile_to_motif(new)

    old_profiles = set(old_p2m)
    new_profiles = set(new_p2m)

    added_profiles   = sorted(new_profiles - old_profiles)
    removed_profiles = sorted(old_profiles - new_profiles)
    common_profiles  = sorted(old_profiles & new_profiles)

    moved = []
    for p in common_profiles:
        if old_p2m[p] != new_p2m[p]:
            moved.append({"profile": p, "motif_old": old_p2m[p], "motif_new": new_p2m[p]})
    moved_df = pd.DataFrame(moved, columns=["profile", "motif_old", "motif_new"])

    added_df = pd.DataFrame(
        [{"profile": p, "motif_new": new_p2m[p]} for p in added_profiles],
        columns=["profile", "motif_new"]
    )
    removed_df = pd.DataFrame(
        [{"profile": p, "motif_old": old_p2m[p]} for p in removed_profiles],
        columns=["profile", "motif_old"]
    )

    def _motif_counts(profiles, p2m, colname):
        df = pd.DataFrame({colname: [p2m[p] for p in profiles]})
        return df.value_counts().rename_axis("motif").reset_index(name="count")

    adds_by_motif    = _motif_counts(added_profiles, new_p2m, "motif") if added_profiles else pd.DataFrame(columns=["motif","count"])
    removes_by_motif = _motif_counts(removed_profiles, old_p2m, "motif") if removed_profiles else pd.DataFrame(columns=["motif","count"])

    # write outputs
    added_df.to_csv(os.path.join(out_dir, "profiles_added.csv"), index=False)
    removed_df.to_csv(os.path.join(out_dir, "profiles_removed.csv"), index=False)
    moved_df.to_csv(os.path.join(out_dir, "profiles_moved.csv"), index=False)
    adds_by_motif.to_csv(os.path.join(out_dir, "profiles_added_by_motif.csv"), index=False)
    removes_by_motif.to_csv(os.path.join(out_dir, "profiles_removed_by_motif.csv"), index=False)

    return {
        "profiles_added": added_df,
        "profiles_removed": removed_df,
        "profiles_moved": moved_df,
        "profiles_added_by_motif": adds_by_motif,
        "profiles_removed_by_motif": removes_by_motif,
    }

def diff_representatives(old_path: str, new_path: str, out_dir: str, compare_profiles_as_sets: bool = True):
    _ensure_dir(out_dir)
    old = _read_csv_as_str(old_path)
    new = _read_csv_as_str(new_path)
    as_set_cols = {"profiles"} if compare_profiles_as_sets else set()
    diffs = _diff_by_key(old, new, key="motif", as_set_cols=as_set_cols)
    diffs["added"].to_csv(os.path.join(out_dir, "reps_added.csv"), index=False)
    diffs["removed"].to_csv(os.path.join(out_dir, "reps_removed.csv"), index=False)
    diffs["changed"].to_csv(os.path.join(out_dir, "reps_changed.csv"), index=False)
    return diffs


def main():
    os.makedirs(DIFF_CHECK_DIR, exist_ok=True)
    reps_diffs = diff_reps_profiles(OLD_REPS, NEW_REPS, DIFF_CHECK_DIR)
    meta_diffs = diff_metadata(OLD_META, NEW_META, DIFF_CHECK_DIR)

    return reps_diffs, meta_diffs


if __name__ == "__main__":
    main()
