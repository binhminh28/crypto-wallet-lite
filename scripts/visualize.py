import csv
from pathlib import Path
import matplotlib.pyplot as plt

OUTPUT_DIR = Path("charts")
OUTPUT_DIR.mkdir(exist_ok=True)


def find_latest_csv():
    csv_files = sorted(Path(".").glob("benchmark_*.csv"), reverse=True)
    if not csv_files:
        raise SystemExit("Không tìm thấy file CSV benchmark. Hãy chạy benchmark trước.")
    return csv_files[0]


def load_data():
    data_path = find_latest_csv()
    print(f"Đang đọc dữ liệu từ: {data_path}")
    
    iterations = []
    total_ms = []
    network_ms = []
    client_ms = []
    ui_gas = []
    actual_gas = []
    gas_dev = []
    rpc_status = []
    etherscan_status = []
    tx_hash = []
    etherscan_value = []
    etherscan_fee = []
    etherscan_gas_price = []

    with data_path.open("r", encoding="utf-8") as f:
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
            tx_hash.append(row.get("tx_hash", ""))
            etherscan_value.append(float(row.get("etherscan_value_eth", "0")))
            etherscan_fee.append(float(row.get("etherscan_fee_eth", "0")))
            etherscan_gas_price.append(float(row.get("etherscan_gas_price_gwei", "0")))

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
        "tx_hash": tx_hash,
        "etherscan_value": etherscan_value,
        "etherscan_fee": etherscan_fee,
        "etherscan_gas_price": etherscan_gas_price,
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
    etherscan_fee = data["etherscan_fee"]
    actual_gas = data["actual_gas"]
    
    use_etherscan_fee = any(f > 0 for f in etherscan_fee)
    gas_data = etherscan_fee if use_etherscan_fee else actual_gas
    gas_label = "Etherscan Fee" if use_etherscan_fee else "Actual Blockchain Fee"

    plt.figure(figsize=(10, 4))
    plt.scatter(iterations, ui_gas, color="blue", label="UI Estimated Fee", alpha=0.6)
    plt.plot(iterations, ui_gas, color="blue", alpha=0.4)
    plt.scatter(iterations, gas_data, color="red", label=gas_label, alpha=0.6)
    plt.plot(iterations, gas_data, color="red", alpha=0.4)
    plt.xlabel("Iteration")
    plt.ylabel("Gas Fee (ETH)")
    plt.title("Gas Estimation Accuracy per Iteration")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "chart4_gas_accuracy.png")
    plt.close()


def chart5_rpc_reliability(data):
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
    data = load_data()

    chart1_stacked_bar(data)
    chart2_boxplot(data)
    chart3_line_total(data)
    chart4_gas_accuracy(data)
    chart5_rpc_reliability(data)

    print(f"Đã vẽ biểu đồ vào thư mục: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
