# Frontend Review Standards

## Performance Metrics
- **LCP (Largest Contentful Paint)**: Aim for < 2.5s.
- **FID (First Input Delay)**: Aim for < 100ms.
- **CLS (Cumulative Layout Shift)**: Aim for < 0.1.
- **Bundle Size**: Monitor third-party dependency impact.

## Accessibility (WCAG 2.1)
- **Perceivable**: Text alternatives, captions, adaptable content, distinguishable contrast.
- **Operable**: Keyboard accessible, enough time, no seizures, navigable.
- **Understandable**: Readable, predictable, input assistance.
- **Robust**: Compatible with current and future user agents (assistive technologies).

## Security Checklist
- **XSS Prevention**: Sanitize user inputs, use Content Security Policy (CSP).
- **Dependency Safety**: Check for known vulnerabilities in `package.json`.
- **Secure Storage**: Avoid storing PII or tokens in `localStorage` where possible; use `HttpOnly` cookies for sensitive data.
- **Communication**: Ensure all traffic is over HTTPS.