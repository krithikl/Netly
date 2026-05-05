import { randomUUID } from "node:crypto";
import type { DomesticPaymentInitiation, DomesticPaymentRisk } from "./client";

const BANK_REFERENCE_MAX_LENGTH = 12;

export type PaymentTestInput = {
  amount?: string;
  creditorAccount?: string;
  creditorName?: string;
  reference?: string;
  particulars?: string;
  code?: string;
};

export type PaymentTestCookie = {
  consentId: string;
  initiation: DomesticPaymentInitiation;
  risk: DomesticPaymentRisk;
};

export function buildPaymentTestRequest(input: PaymentTestInput) {
  const amount = Number(input.amount || "1.00");

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const creditorName = clean(input.creditorName, "MoneyFit Test Payee");
  const creditorAccount = clean(input.creditorAccount, "99-2385-6710320-00");
  const reference = bankReferenceField("Reference", clean(input.reference, "MF test"));
  const particulars = bankReferenceField("Particulars", clean(input.particulars, "MoneyFit"));
  const code = bankReferenceField("Code", clean(input.code, "TEST"));

  const initiation: DomesticPaymentInitiation = {
    InstructedAmount: {
      Amount: amount.toFixed(2),
      Currency: "NZD"
    },
    InstructionIdentification: randomUUID(),
    RemittanceInformation: {
      Reference: {
        CreditorReference: {
          Reference: reference,
          Particulars: particulars,
          Code: code
        },
        CreditorName: creditorName
      }
    },
    CreditorAccount: {
      Identification: creditorAccount,
      SchemeName: "BECSElectronicCredit",
      SecondaryIdentification: `MF-${Date.now()}`,
      Name: creditorName
    },
    DebtorAccountRelease: true,
    EndToEndIdentification: randomUUID()
  };

  const risk: DomesticPaymentRisk = {
    EndUserAppName: "MoneyFit",
    EndUserAppVersion: "MVP",
    PaymentContextCode: "EcommerceServices",
    MerchantName: "MoneyFit Test",
    MerchantNZBN: "9429000000000",
    MerchantCategoryCode: "6012",
    MerchantCustomerIdentification: "moneyfit-dev"
  };

  return {
    initiation,
    risk
  };
}

export function encodePaymentTestCookie(value: PaymentTestCookie) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodePaymentTestCookie(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as PaymentTestCookie;
}

function clean(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function bankReferenceField(label: string, value: string) {
  if (value.length > BANK_REFERENCE_MAX_LENGTH) {
    throw new Error(`${label} must be ${BANK_REFERENCE_MAX_LENGTH} characters or fewer for PNZ domestic payments.`);
  }

  return value;
}
