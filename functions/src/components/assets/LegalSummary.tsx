'use client';

import React from 'react';
import { Alert } from '../ui/Alert';

type Document = {
  name: string;
  url: string;
  type: string;
};

type LegalSummaryProps = {
  metadataURI: string;
  documents: Document[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function LegalSummary({ metadataURI, documents, loading, error, onRetry }: LegalSummaryProps) {
  return (
    <div className="surface rounded-lg">
      <div className="px-6 py-4 border-b border-[color:var(--border)]">
        <div className="text-sm font-semibold">📄 Legal & Documentation</div>
        <div className="mt-1 text-xs text-[color:var(--text-muted)]">
          Asset verification documents and disclosures
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div>
          <div className="text-xs text-[color:var(--text-muted)] mb-1">Metadata URI</div>
          {metadataURI ? (
            <a
              href={metadataURI.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${metadataURI.replace('ipfs://', '')}` : metadataURI}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[color:var(--accent)] hover:underline break-all"
            >
              {metadataURI}
            </a>
          ) : (
            <span className="text-xs text-[color:var(--text-muted)]">No metadata URI set</span>
          )}
        </div>

        {loading && (
          <div className="text-sm text-[color:var(--text-muted)]">Loading documents...</div>
        )}

        {error && (
          <div>
            <Alert type="warning" message={error} />
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-[color:var(--accent)] hover:underline"
            >
              Retry loading documents
            </button>
          </div>
        )}

        {!loading && !error && documents.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-[color:var(--text)] mb-2">Attached Documents:</div>
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 bg-[color:var(--panel-2)] rounded-lg border border-[color:var(--border)]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{doc.name}</div>
                    <div className="text-xs text-[color:var(--text-muted)] mt-0.5">
                      Type: {doc.type || 'Unknown'}
                    </div>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-[color:var(--accent)] hover:bg-[color:var(--accent)]/10 rounded transition-colors"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && documents.length === 0 && metadataURI && (
          <div className="text-sm text-[color:var(--text-muted)]">
            No documents found in metadata
          </div>
        )}

        {!metadataURI && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="text-sm font-semibold text-amber-500">⚠ No Legal Documents</div>
            <div className="mt-1 text-xs text-amber-500/80">
              This asset has no metadata URI set. Verification documents are not available on-chain.
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-[color:var(--border)]">
          <div className="text-xs text-[color:var(--text-muted)]">
            <span className="font-semibold text-[color:var(--text)]">Note:</span> All documents are stored on IPFS or external storage and linked via on-chain metadata URI. Always verify document authenticity independently.
          </div>
        </div>
      </div>
    </div>
  );
}
