import csv
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np

OUTPUT_DIR = Path("charts")
OUTPUT_DIR.mkdir(exist_ok=True)

plt.rcParams.update({
    'font.size': 14,
    'font.weight': 'bold',
    'axes.labelweight': 'bold',
    'axes.titleweight': 'bold',
    'axes.titlesize': 18,
    'axes.labelsize': 16,
    'xtick.labelsize': 14,
    'ytick.labelsize': 14,
    'legend.fontsize': 14,
    'figure.titlesize': 22,
    'figure.titleweight': 'bold'
})

def find_latest_csv():
    csv_files = sorted(Path(".").glob("benchmark_*.csv"), reverse=True)
    if not csv_files:
        raise SystemExit("Không tìm thấy file CSV benchmark. Hãy chạy benchmark trước.")
    return csv_files[0]

def load_data():
    data_path = find_latest_csv()
    print(f"Đang đọc dữ liệu từ: {data_path}")
    
    data = {
        "iterations": [],
        "total_ms": [],
        "network_ms": [],
        "confirm_ms": [],
        "ui_gas": [],
        "actual_gas": [],
        "rpc_status": [],
        "fee_eth": [],
        "sender_balance": [],
        "receiver_balance": []
    }

    with data_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                data["iterations"].append(int(row["iteration"]))
                data["total_ms"].append(float(row["total_ms"]))
                data["network_ms"].append(float(row["network_ms"]))
                data["confirm_ms"].append(float(row.get("confirm_ms", 0)))
                data["ui_gas"].append(float(row["ui_gas_eth"] or 0))
                data["actual_gas"].append(float(row["actual_gas_eth"] or 0))
                data["fee_eth"].append(float(row["fee_eth"] or 0))
                data["rpc_status"].append(row["rpc_status"])
                data["sender_balance"].append(float(row.get("sender_balance_eth", 0) or 0))
                data["receiver_balance"].append(float(row.get("receiver_balance_eth", 0) or 0))
            except ValueError as e:
                print(f"Bỏ qua dòng lỗi: {e}")
                continue

    return data

def chart1_stacked_bar(data):
    iterations = data["iterations"]
    network_ms = data["network_ms"]
    confirm_ms = data["confirm_ms"]

    plt.figure(figsize=(14, 8))
    plt.bar(iterations, network_ms, label="Network Latency (RPC)", color="#4e79a7")
    plt.bar(iterations, confirm_ms, bottom=network_ms, label="Blockchain Confirm", color="#f28e2b")
    
    plt.xlabel("Iteration")
    plt.ylabel("Time (ms)")
    plt.title("Time Breakdown: Network vs Confirmation")
    plt.legend()
    plt.grid(axis='y', linestyle='--', alpha=0.5)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "1_time_breakdown.png")
    plt.close()

def chart2_boxplot(data):
    fig, axes = plt.subplots(1, 3, figsize=(22, 8))
    
    datasets = [data["network_ms"], data["confirm_ms"], data["total_ms"]]
    titles = ["Network Latency (ms)", "Confirmation Time (ms)", "Total End-to-End (ms)"]
    colors = ["#4e79a7", "#f28e2b", "#e15759"]

    for i, ax in enumerate(axes):
        box = ax.boxplot(
            datasets[i], 
            patch_artist=True, 
            showfliers=True, 
            widths=0.6,
            medianprops=dict(linewidth=3, color='yellow')
        )

        for patch in box['boxes']:
            patch.set_facecolor(colors[i])
            patch.set_alpha(0.7)
        
        ax.set_title(titles[i])
        ax.set_ylabel("Time (ms)")
        ax.grid(axis='y', linestyle='--', alpha=0.3)
        
        if len(datasets[i]) > 0:
            median_val = np.median(datasets[i])
            ax.text(
                1.1, median_val, 
                f'Median:\n{median_val:.0f}', 
                verticalalignment='center',
                fontsize=14, fontweight='bold', color='#333333'
            )
            ax.set_xticks([])

    plt.suptitle("Latency Distribution Analysis", fontsize=24, fontweight='bold')
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "2_latency_boxplot_separated.png")
    plt.close()

def chart3_line_total(data):
    iterations = data["iterations"]
    total_ms = data["total_ms"]

    plt.figure(figsize=(14, 7))
    plt.plot(iterations, total_ms, marker="o", linestyle="-", linewidth=3, markersize=8, color="#e15759", label="Total Latency")
    plt.xlabel("Iteration")
    plt.ylabel("Time (ms)")
    plt.title("Total End-to-End Latency Trend")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "3_total_latency_trend.png")
    plt.close()

def chart4_gas_accuracy(data):
    iterations = data["iterations"]
    ui_gas = data["ui_gas"]
    actual_fee = data["fee_eth"]

    plt.figure(figsize=(14, 7))
    plt.plot(iterations, ui_gas, marker="x", linestyle="--", linewidth=3, markersize=10, label="Estimate Fee", color="blue")
    plt.plot(iterations, actual_fee, marker="o", linestyle="-", linewidth=3, markersize=10, label="Actual Fee", color="green")
    
    plt.xlabel("Iteration")
    plt.ylabel("ETH")
    plt.title("Gas Fee Accuracy: Estimated vs Actual")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "4_gas_accuracy.png")
    plt.close()

def chart5_rpc_status(data):
    status_list = data["rpc_status"]
    counts = {}
    for s in status_list:
        counts[s] = counts.get(s, 0) + 1
    
    if not counts:
        return

    labels = list(counts.keys())
    sizes = list(counts.values())
    colors = ['#76b7b2', '#ff9da7', '#edc948', '#b07aa1']

    plt.figure(figsize=(8, 8))
    plt.pie(sizes, labels=labels, autopct="%1.1f%%", startangle=90, colors=colors[:len(labels)], textprops={'fontsize': 16, 'weight': 'bold'})
    plt.title("Transaction Status Distribution (50 transactions)")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "5_transaction_status.png")
    plt.close()

def chart6_balances(data):
    iterations = data["iterations"]
    sender = data["sender_balance"]
    receiver = data["receiver_balance"]
    
    if sum(sender) == 0 and sum(receiver) == 0:
        return

    fig, ax1 = plt.subplots(figsize=(14, 7))

    color = 'tab:red'
    ax1.set_xlabel('Iteration')
    ax1.set_ylabel('Sender Balance (ETH)', color=color)
    ax1.plot(iterations, sender, color=color, linestyle='-', marker='o', linewidth=3, markersize=8, label="Sender")
    ax1.tick_params(axis='y', labelcolor=color)

    ax2 = ax1.twinx()
    color = 'tab:green'
    ax2.set_ylabel('Receiver Balance (ETH)', color=color)
    ax2.plot(iterations, receiver, color=color, linestyle='-', marker='x', linewidth=3, markersize=8, label="Receiver")
    ax2.tick_params(axis='y', labelcolor=color)

    plt.title("Wallet Balances Over Time")
    fig.tight_layout()
    plt.savefig(OUTPUT_DIR / "6_balance_changes.png")
    plt.close()

def main():
    data = load_data()
    
    if not data["iterations"]:
        print("File CSV rỗng hoặc không có dữ liệu hợp lệ.")
        return

    print("Đang vẽ biểu đồ...")
    chart1_stacked_bar(data)
    chart2_boxplot(data)
    chart3_line_total(data)
    chart4_gas_accuracy(data)
    chart5_rpc_status(data)
    chart6_balances(data)

    print(f"✅ Hoàn tất! Đã lưu 6 biểu đồ vào thư mục: {OUTPUT_DIR.absolute()}")

if __name__ == "__main__":
    main()