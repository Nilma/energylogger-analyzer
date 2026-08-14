from __future__ import annotations

import pandas as pd
from scipy import integrate


RAILS = {
    "3V7_WL_SW": (
        "3V7_WL_SW_A current(0)",
        "3V7_WL_SW_V volt(8)",
    ),
    "3V3_SYS": (
        "3V3_SYS_A current(1)",
        "3V3_SYS_V volt(9)",
    ),
    "1V8_SYS": (
        "1V8_SYS_A current(2)",
        "1V8_SYS_V volt(10)",
    ),
    "DDR_VDD2": (
        "DDR_VDD2_A current(3)",
        "DDR_VDD2_V volt(11)",
    ),
    "DDR_VDDQ": (
        "DDR_VDDQ_A current(4)",
        "DDR_VDDQ_V volt(12)",
    ),
    "1V1_SYS": (
        "1V1_SYS_A current(5)",
        "1V1_SYS_V volt(13)",
    ),
    "0V8_SW": (
        "0V8_SW_A current(6)",
        "0V8_SW_V volt(14)",
    ),
    "VDD_CORE": (
        "VDD_CORE_A current(7)",
        "VDD_CORE_V volt(15)",
    ),
    "3V3_DAC": (
        "3V3_DAC_A current(17)",
        "3V3_DAC_V volt(20)",
    ),
    "3V3_ADC": (
        "3V3_ADC_A current(18)",
        "3V3_ADC_V volt(21)",
    ),
    "0V8_AON": (
        "0V8_AON_A current(16)",
        "0V8_AON_V volt(19)",
    ),
    "HDMI": (
        "HDMI_A current(22)",
        "HDMI_V volt(23)",
    ),
}


def analyze_energy(df: pd.DataFrame) -> dict:
    required_columns = {
        "active",
        "duration_s",
    }

    for current_column, voltage_column in RAILS.values():
        required_columns.add(current_column)
        required_columns.add(voltage_column)

    missing = sorted(
        required_columns - set(df.columns)
    )

    if missing:
        raise ValueError(
            "The CSV is missing required columns: "
            + ", ".join(missing)
        )

    active_df = (
        df[df["active"] == 1]
        .copy()
        .reset_index(drop=True)
    )

    if active_df.empty:
        raise ValueError(
            "The CSV does not contain any rows where active == 1."
        )

    if len(active_df) < 2:
        raise ValueError(
            "At least two active measurement rows are required."
        )

    active_df = (
        active_df
        .sort_values("duration_s")
        .reset_index(drop=True)
    )

    for rail, (
        current_column,
        voltage_column,
    ) in RAILS.items():

        active_df[rail] = (
            pd.to_numeric(
                active_df[current_column],
                errors="raise",
            )
            *
            pd.to_numeric(
                active_df[voltage_column],
                errors="raise",
            )
        )

    active_df["Total Power"] = (
        active_df[
            list(RAILS.keys())
        ].sum(axis=1)
    )

    x = pd.to_numeric(
        active_df["duration_s"],
        errors="raise",
    ).to_numpy()

    duration = float(
        x.max() - x.min()
    )

    if duration <= 0:
        raise ValueError(
            "The active measurement duration must be greater than zero."
        )

    energy_by_rail = {}

    for rail in RAILS:
        y = active_df[rail].to_numpy()

        energy = float(
            integrate.trapezoid(
                y,
                x,
            )
        )

        energy_by_rail[rail] = round(
            energy,
            3,
        )

    total_power = (
        active_df["Total Power"]
        .to_numpy()
    )

    total_energy = float(
        integrate.trapezoid(
            total_power,
            x,
        )
    )

    average_power = (
        total_energy / duration
    )

    return {
        "duration_s": round(
            duration,
            3,
        ),
        "average_power_w": round(
            average_power,
            3,
        ),
        "total_energy_j": round(
            total_energy,
            3,
        ),
        "energy_by_rail_j":
            energy_by_rail,
    }