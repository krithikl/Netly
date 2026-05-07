import type { ChangeEvent, FormEvent } from "react";
import { TransactionList } from "@/components/transactions/TransactionList";
import { PanelTitle } from "@/components/ui/PanelTitle";
import { bankReferenceMaxLength } from "@/lib/app/constants";
import { formatMoney } from "@/lib/insights";
import type { PaymentTestForm, PaymentTestResult } from "@/lib/app/types";
import type { Transaction } from "@/lib/types";

type PaymentTestViewProps = {
  categoryColors: Record<string, string>;
  isLoadingTransactions: boolean;
  isStartingPaymentTest: boolean;
  onRefreshTransactions: () => void;
  onStartPaymentTest: (event: FormEvent<HTMLFormElement>) => void;
  paymentBalanceDelta: number | null;
  paymentFeedNote: string;
  paymentTestForm: PaymentTestForm;
  paymentTestHelp: string;
  paymentTestResult: PaymentTestResult | null;
  paymentTransactionDelta: number | null;
  recentTransactions: Transaction[];
  syncResult: string;
  updatePaymentTestForm: (field: keyof PaymentTestForm, value: string) => void;
};

export function PaymentTestView({
  categoryColors,
  isLoadingTransactions,
  isStartingPaymentTest,
  onRefreshTransactions,
  onStartPaymentTest,
  paymentBalanceDelta,
  paymentFeedNote,
  paymentTestForm,
  paymentTestHelp,
  paymentTestResult,
  paymentTransactionDelta,
  recentTransactions,
  syncResult,
  updatePaymentTestForm
}: PaymentTestViewProps) {
  return (
    <section className="view-stack">
      <section className="material-card">
        <div className="panel-header">
          <PanelTitle title="Payment test" subtitle="Create and authorize a PNZ sandbox domestic payment" />
          <button className="tonal-action" disabled={isLoadingTransactions} onClick={onRefreshTransactions} type="button">
            Refresh PNZ data
          </button>
        </div>
        <div className="status-banner neutral payment-help" role="note">
          <span className="payment-help-icon" title={paymentTestHelp} aria-label={paymentTestHelp}>
            i
          </span>
          <strong>Use the same sandbox user.</strong>
          <span>{paymentTestHelp}</span>
        </div>
        <PaymentTestFormFields
          form={paymentTestForm}
          isStartingPaymentTest={isStartingPaymentTest}
          onSubmit={onStartPaymentTest}
          updatePaymentTestForm={updatePaymentTestForm}
        />
        {paymentTestResult && (
          <PaymentResult
            paymentBalanceDelta={paymentBalanceDelta}
            paymentTestResult={paymentTestResult}
            paymentTransactionDelta={paymentTransactionDelta}
          />
        )}
        {paymentFeedNote && (
          <div className="status-banner neutral" role="status">
            <strong>Transactions unchanged.</strong>
            <span>{paymentFeedNote}</span>
          </div>
        )}
        <p aria-live="polite" className="sync-result">
          {paymentTestResult?.error || syncResult}
        </p>
        <div className="stable-list-panel">
          <TransactionList categoryColors={categoryColors} emptyMessage="No PNZ user transactions loaded yet." transactions={recentTransactions} />
        </div>
      </section>
    </section>
  );
}

type PaymentTestFormFieldsProps = {
  form: PaymentTestForm;
  isStartingPaymentTest: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  updatePaymentTestForm: (field: keyof PaymentTestForm, value: string) => void;
};

function PaymentTestFormFields({ form, isStartingPaymentTest, onSubmit, updatePaymentTestForm }: PaymentTestFormFieldsProps) {
  const handleAmountChange = createPaymentFieldHandler("amount", updatePaymentTestForm);
  const handleCreditorNameChange = createPaymentFieldHandler("creditorName", updatePaymentTestForm);
  const handleCreditorAccountChange = createPaymentFieldHandler("creditorAccount", updatePaymentTestForm);
  const handleReferenceChange = createPaymentFieldHandler("reference", updatePaymentTestForm);
  const handleParticularsChange = createPaymentFieldHandler("particulars", updatePaymentTestForm);
  const handleCodeChange = createPaymentFieldHandler("code", updatePaymentTestForm);

  return (
    <form className="payment-form" onSubmit={onSubmit}>
      <label>
        Amount
        <input min="0.01" onChange={handleAmountChange} step="0.01" type="number" value={form.amount} />
      </label>
      <label>
        Creditor name
        <input onChange={handleCreditorNameChange} value={form.creditorName} />
      </label>
      <label>
        Creditor account
        <input onChange={handleCreditorAccountChange} value={form.creditorAccount} />
      </label>
      <label>
        Reference
        <input maxLength={bankReferenceMaxLength} onChange={handleReferenceChange} value={form.reference} />
      </label>
      <label>
        Particulars
        <input maxLength={bankReferenceMaxLength} onChange={handleParticularsChange} value={form.particulars} />
      </label>
      <label>
        Code
        <input maxLength={bankReferenceMaxLength} onChange={handleCodeChange} value={form.code} />
      </label>
      <button className="primary-button" disabled={isStartingPaymentTest} type="submit">
        {isStartingPaymentTest ? "Starting payment..." : "Authorize sandbox payment"}
      </button>
    </form>
  );
}

function createPaymentFieldHandler(field: keyof PaymentTestForm, updatePaymentTestForm: (field: keyof PaymentTestForm, value: string) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => updatePaymentTestForm(field, event.target.value);
}

function PaymentResult({
  paymentBalanceDelta,
  paymentTestResult,
  paymentTransactionDelta
}: {
  paymentBalanceDelta: number | null;
  paymentTestResult: PaymentTestResult;
  paymentTransactionDelta: number | null;
}) {
  const paymentStatus = paymentTestResult.status === "error" ? "Failed" : paymentTestResult.paymentStatus || "Submitted";
  const transactionRows = paymentTransactionDelta === null ? "Pending refresh" : `${paymentTransactionDelta >= 0 ? "+" : ""}${paymentTransactionDelta}`;

  return (
    <div className="payment-result">
      <div>
        <span>Payment status</span>
        <strong>{paymentStatus}</strong>
      </div>
      <div>
        <span>Payment ID</span>
        <strong>{paymentTestResult.paymentId || "Not returned"}</strong>
      </div>
      <div>
        <span>Balance change</span>
        <strong>{paymentBalanceDelta === null ? "Pending refresh" : formatMoney(paymentBalanceDelta, true)}</strong>
      </div>
      <div>
        <span>Transaction rows</span>
        <strong>{transactionRows}</strong>
      </div>
    </div>
  );
}
