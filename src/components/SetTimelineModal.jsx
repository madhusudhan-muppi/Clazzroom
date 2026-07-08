import { useState } from 'react';
import { X } from 'lucide-react';
import { PROJECT_STAGES } from '../lib/stages';

export default function SetTimelineModal({ isOpen, onClose, onSave, existingTimeline }) {
  const [startDate, setStartDate] = useState(existingTimeline?.project_start_date?.slice(0, 10) || '');
  const [endDate, setEndDate] = useState(existingTimeline?.project_end_date?.slice(0, 10) || '');
  const [useCustom, setUseCustom] = useState(!!existingTimeline?.custom_durations);
  const [customDurations, setCustomDurations] = useState(
    existingTimeline?.custom_durations || PROJECT_STAGES.map(() => 7)
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  function handleDurationChange(index, value) {
    const updated = [...customDurations];
    updated[index] = Math.max(1, parseInt(value) || 1);
    setCustomDurations(updated);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        project_start_date: new Date(startDate).toISOString(),
        project_end_date: new Date(endDate).toISOString(),
      };

      if (useCustom) {
        data.custom_durations = customDurations;
      } else {
        data.custom_durations = null;
      }

      await onSave(data);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save timeline settings.');
    } finally {
      setLoading(false);
    }
  }

  const totalCustomDays = customDurations.reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">Project Timeline Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {startDate && endDate && (
            <p className="text-sm text-gray-500">
              Total duration: {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} days
              {!useCustom && <> (~{Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) / 8)} days per stage)</>}
            </p>
          )}

          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">Set custom duration per stage</span>
            </label>
          </div>

          {useCustom && (
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Days per stage (proportional)</p>
              {PROJECT_STAGES.map((stage, i) => (
                <div key={stage.key} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-40 truncate">{stage.name}</span>
                  <input
                    type="number"
                    min="1"
                    value={customDurations[i]}
                    onChange={(e) => handleDurationChange(i, e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-xs text-gray-400">days</span>
                </div>
              ))}
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                Total: {totalCustomDays} days (will be proportionally fit to your date range)
              </p>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-70 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Timeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
