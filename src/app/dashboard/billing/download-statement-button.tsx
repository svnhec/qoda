"use client";

/**
 * Download Statement Button
 * =============================================================================
 * Client component that handles CSV export of client transaction statements.
 * Fetches transaction data and generates a downloadable CSV file.
 * =============================================================================
 */

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadStatementButtonProps {
    clientId: string;
    clientName: string;
}

import { formatCurrency } from "@/lib/types/currency";

/**
 * Transaction data for CSV export.
 */
interface TransactionForExport {
    date: string;
    merchant_name: string;
    merchant_category: string;
    amount_cents: bigint;
    markup_fee_cents: bigint;
    total_cents: bigint;
}

export function DownloadStatementButton({
    clientId,
    clientName,
}: DownloadStatementButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        setIsLoading(true);

        try {
            // Fetch transactions from API
            const response = await fetch(
                `/api/billing/statement?clientId=${clientId}`
            );

            if (!response.ok) {
                throw new Error("Failed to fetch statement data");
            }

            const rawData = await response.json() as {
                transactions: Array<{
                    date: string;
                    merchant_name: string;
                    merchant_category: string;
                    amount_cents: string;
                    markup_fee_cents: string;
                    total_cents: string;
                }>;
                period: string;
                totals: {
                    spend: string;
                    markup: string;
                    total: string;
                };
            };

            // Convert strings to BigInt
            const data = {
                transactions: rawData.transactions.map(tx => ({
                    ...tx,
                    amount_cents: BigInt(tx.amount_cents),
                    markup_fee_cents: BigInt(tx.markup_fee_cents),
                    total_cents: BigInt(tx.total_cents),
                })),
                period: rawData.period,
                totals: {
                    spend: BigInt(rawData.totals.spend),
                    markup: BigInt(rawData.totals.markup),
                    total: BigInt(rawData.totals.total),
                },
            };

            // Generate CSV content
            const csvContent = generateCSV(data.transactions, clientName, data.period, data.totals);

            // Create and download file
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `statement_${clientName.replace(/\s+/g, "_")}_${data.period}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download statement:", error);
            // Could add toast notification here
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={isLoading}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Download className="w-4 h-4" />
            )}
            CSV
        </Button>
    );
}

/**
 * Generate CSV content from transactions.
 */
function generateCSV(
    transactions: TransactionForExport[],
    clientName: string,
    period: string,
    totals: { spend: bigint; markup: bigint; total: bigint }
): string {
    const lines: string[] = [];

    // Header info
    lines.push(`Statement for: ${clientName}`);
    lines.push(`Billing Period: ${period}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");

    // Column headers
    lines.push("Date,Merchant,Category,Amount,Markup Fee,Total");

    // Transaction rows
    for (const tx of transactions) {
        const row = [
            tx.date,
            `"${tx.merchant_name.replace(/"/g, '""')}"`, // Escape quotes
            tx.merchant_category || "",
            formatCurrency(tx.amount_cents),
            formatCurrency(tx.markup_fee_cents),
            formatCurrency(tx.total_cents),
        ];
        lines.push(row.join(","));
    }

    // Totals row
    lines.push("");
    lines.push(
        `TOTAL,,,${formatCurrency(totals.spend)},${formatCurrency(totals.markup)},${formatCurrency(totals.total)}`
    );

    return lines.join("\n");
}

