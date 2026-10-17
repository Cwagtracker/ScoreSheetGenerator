import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = worker;
export default function Preview({ url }: { url: string }) {
  const target = useRef<HTMLDivElement>(null),
    [status, setStatus] = useState("Rendering preview…");
  useEffect(() => {
    let cancelled = false;
    const task = getDocument({ url });
    setStatus("Rendering preview…");
    void (async () => {
      try {
        const doc = await task.promise;
        if (cancelled) return;
        target.current?.replaceChildren();
        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelled) return;
          const page = await doc.getPage(n),
            viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            `PDF page ${n} of ${doc.numPages}. Use the full-size PDF link for accessible text.`,
          );
          target.current?.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
        }
        if (!cancelled)
          setStatus(
            `${doc.numPages} page${doc.numPages === 1 ? "" : "s"} ready to review.`,
          );
      } catch (e) {
        if (!cancelled)
          setStatus(
            "Preview unavailable. Open the full-size PDF to review it.",
          );
      }
    })();
    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [url]);
  return (
    <>
      <p className="hint" role="status">
        {status}
      </p>
      <div
        ref={target}
        className="pdf-pages"
        aria-label="Score sheets PDF preview"
      />
    </>
  );
}
