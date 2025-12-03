import csv
from pathlib import Path

import matplotlib.pyplot as plt


DATA_PATH = Path("benchmark_data.csv")
OUTPUT_DIR = Path("charts")
OUTPUT_DIR.mkdir(exist_ok=True)


def load_data():
    iterations = []
    total_ms = []
    network_ms = []
    client_ms = []
    ui_gas = []
    actual_gas = []
    gas_dev = []
    rpc_status = []
    etherscan_status = []

    with DATA_PATH.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            iterations.append(int(row["iteration"]))
            total_ms.append(float(row["total_ms"]))
            network_ms.append(float(row["network_ms"]))
            client_ms.append(float(row["client_ms"]))
            ui_gas.append(float(row["ui_gas_eth"]))
            actual_gas.append(float(row["actual_gas_eth"]))
            gas_dev.append(float(row["gas_deviation_eth"]))
            rpc_status.append(row["rpc_status"])
            etherscan_status.append(row["etherscan_status"])

    return {
        "iterations": iterations,
        "total_ms": total_ms,
        "network_ms": network_ms,
        "client_ms": client_ms,
        "ui_gas": ui_gas,
        "actual_gas": actual_gas,
        "gas_dev": gas_dev,
        "rpc_status": rpc_status,
        "etherscan_status": etherscan_status,
    }


def chart1_stacked_bar(data):
    iterations = data["iterations"]
    network_ms = data["network_ms"]
    client_ms = data["client_ms"]

    plt.figure(figsize=(10, 6))
    plt.bar(iterations, client_ms, label="Client time (ms)")
    plt.bar(iterations, network_ms, bottom=client_ms, label="Network time (ms)")
    plt.xlabel("Iteration")
    plt.ylabel("Time (ms)")
    plt.title("End-to-End Latency Breakdown per Iteration")
    plt.legend()
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "chart1_stacked_bar_latency.png")
    plt.close()


def chart2_boxplot(data):
    plt.figure(figsize=(8, 6))
    plt.boxplot(
        [data["client_ms"], data["network_ms"], data["total_ms"]],
        labels=["Client", "Network", "Total"],
        showfliers=False,
    )
    plt.ylabel("Time (ms)")
    plt.title("Latency Distribution")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "chart2_boxplot_latency.png")
    plt.close()


def chart3_line_total(data):
    iterations = data["iterations"]
    total_ms = data["total_ms"]

    plt.figure(figsize=(10, 4))
    plt.plot(iterations, total_ms, marker="o", linestyle="-", label="Total E2E latency")
    plt.xlabel("Iteration")
    plt.ylabel("Time (ms)")
    plt.title("Total End-to-End Latency over Iterations")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "chart3_line_total_latency.png")
    plt.close()


def chart4_gas_accuracy(data):
    iterations = data["iterations"]
    ui_gas = data["ui_gas"]
    actual_gas = data["actual_gas"]

    plt.figure(figsize=(10, 4))
    # Scatter + line to dễ đọc
    plt.scatter(iterations, ui_gas, color="blue", label="UI Estimated Fee", alpha=0.6)
    plt.plot(iterations, ui_gas, color="blue", alpha=0.4)
    plt.scatter(iterations, actual_gas, color="red", label="Actual Blockchain Fee", alpha=0.6)
    plt.plot(iterations, actual_gas, color="red", alpha=0.4)
    plt.xlabel("Iteration")
    plt.ylabel("Gas Fee (ETH)")
    plt.title("Gas Estimation Accuracy per Iteration")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "chart4_gas_accuracy.png")
    plt.close()


def chart5_rpc_reliability(data):
    # Sử dụng status từ cả RPC & Etherscan: một tx coi là success nếu cả 2 success
    combined = []
    for r, e in zip(data["rpc_status"], data["etherscan_status"]):
        if r == "success" and e == "success":
            combined.append("success")
        elif r == "error" or e == "error":
            combined.append("error")
        else:
            combined.append("fail")

    success_count = combined.count("success")
    fail_count = combined.count("fail")
    error_count = combined.count("error")

    labels = []
    sizes = []
    if success_count:
        labels.append("Success")
        sizes.append(success_count)
    if fail_count:
        labels.append("Fail")
        sizes.append(fail_count)
    if error_count:
        labels.append("Error")
        sizes.append(error_count)

    if not sizes:
        return

    plt.figure(figsize=(6, 6))
    plt.pie(sizes, labels=labels, autopct="%1.1f%%", startangle=90)
    plt.title("RPC Reliability (Success vs Fail/Error)")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "chart5_rpc_reliability.png")
    plt.close()


def main():
    if not DATA_PATH.exists():
        raise SystemExit(f"Không tìm thấy {DATA_PATH}. Hãy chạy benchmark trước.")

    data = load_data()

    chart1_stacked_bar(data)
    chart2_boxplot(data)
    chart3_line_total(data)
    chart4_gas_accuracy(data)
    chart5_rpc_reliability(data)

    print(f"Đã vẽ biểu đồ vào thư mục: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()


