import { createElement } from "react";
import { Body, Button, Container, Heading, Html, Text } from "@react-email/components";

const CONTAINER_STYLE = {
  backgroundColor: "#ffffff",
  padding: "24px",
  borderRadius: "8px",
  maxWidth: "480px",
  margin: "0 auto",
  fontFamily: "sans-serif",
};

const BUTTON_STYLE = {
  backgroundColor: "#111827",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "6px",
  textDecoration: "none",
  display: "inline-block",
};

/**
 * No JSX — this backend ships plain JavaScript with no build step
 * (be-architecture.md), so templates are built with `createElement` directly.
 * @param {{ name: string, url: string }} props
 */
export function VerificationEmail({ name, url }) {
  return createElement(
    Html,
    null,
    createElement(
      Body,
      { style: { backgroundColor: "#f6f6f6", padding: "32px 0" } },
      createElement(
        Container,
        { style: CONTAINER_STYLE },
        createElement(Heading, { as: "h2" }, "Verify your email"),
        createElement(Text, null, `Hi ${name}, confirm your TerraSpace account to get started.`),
        createElement(Button, { href: url, style: BUTTON_STYLE }, "Verify email"),
        createElement(
          Text,
          { style: { color: "#666666", fontSize: "12px" } },
          "If you didn't request this, you can safely ignore this email.",
        ),
      ),
    ),
  );
}
