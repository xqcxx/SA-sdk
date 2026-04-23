import { stringAsciiCV, stringUtf8CV, uintCV } from "@stacks/transactions";
import type { ClarityValue } from "@stacks/transactions";
import type {
  PageViewEvent,
  ActionEvent,
  ConversionEvent,
  CustomEvent,
} from "./types.js";

export function buildPageViewArgs(event: PageViewEvent): ClarityValue[] {
  return [
    stringAsciiCV(event.projectId),
    stringUtf8CV(event.page),
  ];
}

export function buildActionArgs(event: ActionEvent): ClarityValue[] {
  return [
    stringAsciiCV(event.projectId),
    stringAsciiCV(event.action),
    stringUtf8CV(event.target),
  ];
}

export function buildConversionArgs(event: ConversionEvent): ClarityValue[] {
  return [
    stringAsciiCV(event.projectId),
    stringAsciiCV(event.conversionType),
    uintCV(event.value),
  ];
}

export function buildCustomEventArgs(event: CustomEvent): ClarityValue[] {
  return [
    stringAsciiCV(event.projectId),
    stringAsciiCV(event.eventType),
    stringUtf8CV(event.payload),
  ];
}

export function buildContractArgs(
  eventType: "page-view" | "action" | "conversion" | "custom",
  event: PageViewEvent | ActionEvent | ConversionEvent | CustomEvent,
): ClarityValue[] {
  switch (eventType) {
    case "page-view":
      return buildPageViewArgs(event as PageViewEvent);
    case "action":
      return buildActionArgs(event as ActionEvent);
    case "conversion":
      return buildConversionArgs(event as ConversionEvent);
    case "custom":
      return buildCustomEventArgs(event as CustomEvent);
  }
}

export function getContractFunctionName(
  eventType: "page-view" | "action" | "conversion" | "custom",
): string {
  const map: Record<string, string> = {
    "page-view": "track-page-view",
    action: "track-action",
    conversion: "track-conversion",
    custom: "track-custom-event",
  };
  return map[eventType];
}
