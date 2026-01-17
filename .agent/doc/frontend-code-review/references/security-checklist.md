# Frontend Security Checklist

## Cross-Site Scripting (XSS) Prevention
- [ ] **Data Binding**: Are you avoiding `dangerouslySetInnerHTML` in React or `v-html` in Vue unless strictly necessary?
- [ ] **Sanitization**: If rendering user-provided HTML, is it sanitized using a library like `DOMPurify`?
- [ ] **URL Sanitization**: Are `href` attributes validated to prevent `javascript:` protocol injections?

## Data Protection
- [ ] **Sensitive Info**: Is sensitive data (PII, tokens) kept out of `localStorage`? (Use `HttpOnly` cookies instead).
- [ ] **State Management**: Is sensitive state cleared upon logout?
- [ ] **Logging**: Are you ensuring that API keys or secrets are not printed to the console in production?

## Communication & Headers
- [ ] **CSRF**: Are state-changing requests (POST/PUT/DELETE) protected by CSRF tokens or SameSite cookie attributes?
- [ ] **CSP**: Is there a Content Security Policy (CSP) header defined to restrict script sources?
- [ ] **Subresource Integrity**: Are external scripts loaded with `integrity` hashes?

## Dependency Safety
- [ ] **Vulnerability Scanning**: Are there known vulnerabilities in `package.json` (run `npm audit`)??
- [ ] **Version Pinning**: Are dependencies pinned to specific versions to avoid supply chain attacks?

## Code Example: XSS Prevention

### ❌ BAD: Direct injection
```javascript
const Comment = ({ userHtml }) => {
  return <div dangerouslySetInnerHTML={{ __html: userHtml }} />;
};
```

### ✅ GOOD: Sanitized output
```javascript
import DOMPurify from 'dompurify';

const Comment = ({ userHtml }) => {
  const cleanHtml = DOMPurify.sanitize(userHtml);
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
};
```