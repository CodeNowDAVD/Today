import type { Components } from "react-markdown";
import { highlightMarkdownFence } from "./markdownHighlight";

function isBlockCode(className?: string, text?: string): boolean {
  if (className?.includes("language-")) return true;
  return Boolean(text && text.includes("\n"));
}

export function createMarkdownPreviewComponents(): Components {
  return {
    a({ href, children, ...props }) {
      const external = href?.startsWith("http://") || href?.startsWith("https://");
      return (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          {...props}
        >
          {children}
        </a>
      );
    },

    table({ children, ...props }) {
      return (
        <div className="md-preview__table-wrap">
          <table {...props}>{children}</table>
        </div>
      );
    },

    img({ src, alt, ...props }) {
      if (!src) return null;
      if (!src.startsWith("http://") && !src.startsWith("https://") && !src.startsWith("data:")) {
        return (
          <span className="md-preview__img-placeholder" title={src}>
            {alt ? `Imagen: ${alt}` : `Imagen: ${src}`}
          </span>
        );
      }
      return <img className="md-preview__img" src={src} alt={alt ?? ""} loading="lazy" {...props} />;
    },

    pre({ children }) {
      return <>{children}</>;
    },

    code({ className, children, ...props }) {
      const text = String(children).replace(/\n$/, "");
      const match = /language-([\w+-]+)/.exec(className ?? "");
      const language = match?.[1];

      if (!isBlockCode(className, text)) {
        return (
          <code className="md-preview__inline-code" {...props}>
            {children}
          </code>
        );
      }

      const highlighted = highlightMarkdownFence(text, language);
      if (highlighted) {
        return (
          <pre className="md-preview__code-block">
            <code
              className={["hljs", language && `language-${language}`].filter(Boolean).join(" ")}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </pre>
        );
      }

      return (
        <pre className="md-preview__code-block md-preview__code-block--plain">
          <code>{text}</code>
        </pre>
      );
    },

    input({ type, ...props }) {
      if (type === "checkbox") {
        return <input type="checkbox" className="md-preview__checkbox" disabled {...props} />;
      }
      return <input type={type} {...props} />;
    },
  };
}
