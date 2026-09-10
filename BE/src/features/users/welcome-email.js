import { createElement } from "react";
import { Body, Container, Heading, Html, Text } from "@react-email/components";

const CONTAINER_STYLE = {
  backgroundColor: "#ffffff",
  padding: "24px",
  borderRadius: "8px",
  maxWidth: "480px",
  margin: "0 auto",
  fontFamily: "sans-serif",
};

/**
 * No JSX — see features/auth/emails/verification-email.js for why.
 * @param {{ name: string }} props
 * @returns {import("react").ReactElement}
 */
export function WelcomeEmail({ name }) {
  return createElement(
    Html,
    null,
    createElement(
      Body,
      { style: { backgroundColor: "#f6f6f6", padding: "32px 0" } },
      createElement(
        Container,
        { style: CONTAINER_STYLE },
        createElement(Heading, { as: "h2" }, "Welcome to TerraSpace"),
        createElement(
          Text,
          null,
          `Hi ${name}, an account was created for you by an administrator.`,
        ),
      ),
    ),
  );
}
