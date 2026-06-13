import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal.jsx'
import {
  getReports,
  dismissReport,
  removeListingForReport,
  suspendVendorForReport
} from '../../services/adminService.js'
import { formatWhen } from '../../utils/format.js'

export default function ReviewReportsPage() {
  const navigate = useNavigate()

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  // modal state: { type: 'remove' | 'suspend', report }
  const [action, setAction] = useState(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [suspensionReason, setSuspensionReason] = useState('')

  useEffect(() => {
    getReports()
      .then(setReports)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function closeModal() {
    setAction(null)
    setResolutionNote('')
    setSuspensionReason('')
  }

  async function handleDismiss(id) {
    setBusyId(id)
    setError('')
    try {
      await dismissReport(id)
      setReports((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleResolve(e) {
    e.preventDefault()
    const { type, report } = action
    setBusyId(report.id)
    setError('')
    try {
      if (type === 'remove') {
        await removeListingForReport(report.id, resolutionNote)
      } else {
        await suspendVendorForReport(report.id, { suspensionReason, resolutionNote })
      }
      setReports((prev) => prev.filter((r) => r.id !== report.id))
      closeModal()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="app-page">
      <button type="button" className="back-link" onClick={() => navigate('/admin/dashboard')}>
        ‹ Back
      </button>
      <h2>Reports ({reports.length})</h2>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : reports.length === 0 ? (
        <p className="muted">No open reports</p>
      ) : (
        <ul className="listing-list">
          {reports.map((r) => (
            <li key={r.id} className="card report-card">
              <strong>{r.listingTitle}</strong>
              <p className="report-reason">"{r.reason}"</p>
              <span className="muted">
                Reported by {r.reporterName} · {formatWhen(r.createdAt)}
              </span>
              <div className="listing-row-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busyId === r.id}
                  onClick={() => handleDismiss(r.id)}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busyId === r.id}
                  onClick={() => setAction({ type: 'remove', report: r })}
                >
                  Remove Listing
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busyId === r.id}
                  onClick={() => setAction({ type: 'suspend', report: r })}
                >
                  Suspend Vendor
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {action && (
        <Modal onClose={closeModal}>
          <form onSubmit={handleResolve}>
            <h3>
              {action.type === 'remove'
                ? `Remove "${action.report.listingTitle}"?`
                : `Suspend vendor of "${action.report.listingTitle}"?`}
            </h3>

            {action.type === 'suspend' && (
              <>
                <label htmlFor="suspension-reason">Suspension reason (shown to vendor)</label>
                <textarea
                  id="suspension-reason"
                  rows="2"
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  required
                />
              </>
            )}

            <label htmlFor="resolution-note">Resolution note</label>
            <textarea
              id="resolution-note"
              rows="2"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              required
            />

            <div className="filter-actions">
              <button type="button" className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={busyId === action.report.id}
              >
                Confirm
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
