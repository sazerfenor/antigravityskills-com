# Frontend Security Best Practices

## Protection Measures
- [ ] **XSS Prevention**: Sanitize all user-generated content before rendering.
- [ ] **Dangerous APIs**: Avoid `dangerouslySetInnerHTML` (React) or `v-html` (Vue) unless content is trusted/sanitized.
- [ ] **Dependency Safety**: Check for vulnerabilities in `package.json` dependencies.
- [ ] **Content Security Policy (CSP)**: Recommend headers that restrict script sources.
- [ ] **Sensitive Data**: Never store PII or secrets in `localStorage` or `sessionStorage`.

## Code Examples

### XSS Prevention (React)
❌ **BAD**:
```javascript
const UserProfile = ({ bio }) => {
  return <div dangerouslySetInnerHTML={{ __html: bio }} />;
};
```

✅ **GOOD**:
```javascript
import DOMPurify from 'dompurify';

const UserProfile = ({ bio }) => {
  const cleanBio = DOMPurify.sanitize(bio);
  return <div dangerouslySetInnerHTML={{ __html: cleanBio }} />;
};
```

### Target="_blank"
❌ **BAD**:
```html
<a href="https://external.com" target="_blank">Visit</a>
```

✅ **GOOD**:
```html
<a href="https://external.com" target="_blank" rel="noopener noreferrer">Visit</a>
```