import { useState } from 'react'
import PropTypes from 'prop-types'
import { ChevronDown, ChevronUp, AlertTriangle, Check, X, FileWarning } from 'lucide-react'

const ConflictResolutionTable = ({
  conflicts,
  newEntries,
  resolutions,
  onResolutionChange,
  onSelectAll
}) => {
  const [expandedRows, setExpandedRows] = useState(new Set())

  const toggleRow = (rowIndex) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(rowIndex)) {
      newExpanded.delete(rowIndex)
    } else {
      newExpanded.add(rowIndex)
    }
    setExpandedRows(newExpanded)
  }

  const getConflictIcon = (conflictType) => {
    if (conflictType === 'exact') {
      return <AlertTriangle className="w-5 h-5 text-red-500" />
    }
    return <FileWarning className="w-5 h-5 text-yellow-500" />
  }

  const getConflictLabel = (conflictType) => {
    if (conflictType === 'exact') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Exact Match
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Potential Duplicate
      </span>
    )
  }

  const getActionBadge = (action) => {
    if (action === 'override') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Override
        </span>
      )
    }
    if (action === 'skip') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Skip
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Undecided
      </span>
    )
  }

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">Not set</span>
    }
    return value
  }

  const renderDifference = (field, existing, incoming) => {
    const isDifferent = existing?.toString().toLowerCase().trim() !== incoming?.toString().toLowerCase().trim()
    
    return (
      <div className={`p-2 rounded ${isDifferent ? 'bg-yellow-50 border border-yellow-200' : ''}`}>
        <div className="text-xs text-gray-500 mb-1">{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`text-sm ${isDifferent ? 'line-through text-gray-500' : ''}`}>
            {formatValue(existing)}
          </div>
          <div className={`text-sm font-medium ${isDifferent ? 'text-blue-600' : ''}`}>
            {formatValue(incoming)}
          </div>
        </div>
      </div>
    )
  }

  const allResolved = conflicts.every(c => resolutions[c.rowIndex])
  const overrideCount = Object.values(resolutions).filter(r => r === 'override').length
  const skipCount = Object.values(resolutions).filter(r => r === 'skip').length

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{conflicts.length}</div>
          <div className="text-sm text-blue-800">Total Conflicts</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-600">{newEntries?.length || 0}</div>
          <div className="text-sm text-green-800">New Entries</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{overrideCount}</div>
          <div className="text-sm text-purple-800">Override Selected</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-600">{skipCount}</div>
          <div className="text-sm text-gray-800">Skip Selected</div>
        </div>
      </div>

      {/* Bulk Actions */}
      {conflicts.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">
            {allResolved ? (
              <span className="flex items-center text-green-600">
                <Check className="w-4 h-4 mr-1" />
                All conflicts resolved
              </span>
            ) : (
              <span className="flex items-center text-yellow-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {conflicts.length - Object.keys(resolutions).length} conflicts need resolution
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onSelectAll('override')}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
            >
              Select All Override
            </button>
            <button
              onClick={() => onSelectAll('skip')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Select All Skip
            </button>
          </div>
        </div>
      )}

      {/* Conflicts Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                Expand
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Row
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Site Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Site Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Differences
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {conflicts.map((conflict) => {
              const isExpanded = expandedRows.has(conflict.rowIndex)
              const currentAction = resolutions[conflict.rowIndex]

              return (
                <>
                  <tr
                    key={conflict.rowIndex}
                    className={`hover:bg-gray-50 ${currentAction === 'override' ? 'bg-blue-50' : currentAction === 'skip' ? 'bg-gray-50' : ''}`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleRow(conflict.rowIndex)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conflict.rowIndex}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getConflictIcon(conflict.conflictType)}
                        {getConflictLabel(conflict.conflictType)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {conflict.existing.site_code}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="max-w-xs truncate" title={conflict.existing.site_name}>
                        {conflict.existing.site_name}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="max-w-xs truncate">
                        {conflict.existing.municipality}, {conflict.existing.province}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {conflict.differences.length} field{conflict.differences.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onResolutionChange(conflict.rowIndex, 'override')}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            currentAction === 'override'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          Override
                        </button>
                        <button
                          onClick={() => onResolutionChange(conflict.rowIndex, 'skip')}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            currentAction === 'skip'
                              ? 'bg-gray-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Skip
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getActionBadge(currentAction)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="border border-gray-200 rounded-lg bg-white p-4">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Existing Data */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                Existing Data (Database)
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-gray-500">Last Updated</div>
                                  <div>{new Date(conflict.existing.updated_at).toLocaleString()}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-gray-500">Status</div>
                                  <div>{conflict.existing.status}</div>
                                </div>
                              </div>
                            </div>

                            {/* Incoming Data */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                                Incoming Data (CSV)
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-gray-500">Row Number</div>
                                  <div>{conflict.rowIndex}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-gray-500">Status</div>
                                  <div>{conflict.incoming.status}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Differences */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                              Field Differences
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {conflict.differences.map((field) => (
                                <div key={field}>
                                  {renderDifference(field, conflict.existing[field], conflict.incoming[field])}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* New Entries Summary */}
      {newEntries && newEntries.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="text-sm font-medium text-green-900">
              {newEntries.length} New Entr{newEntries.length === 1 ? 'y' : 'ies'} Will Be Created
            </h4>
          </div>
          <p className="text-sm text-green-700 mt-1">
            These entries have no conflicts and will be imported as new projects.
          </p>
        </div>
      )}

      {/* No Conflicts Message */}
      {conflicts.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-green-900 mb-1">
            No Conflicts Detected
          </h4>
          <p className="text-sm text-green-700">
            All entries in your CSV file are new and ready to be imported.
          </p>
        </div>
      )}
    </div>
  )
}

ConflictResolutionTable.propTypes = {
  conflicts: PropTypes.arrayOf(PropTypes.shape({
    rowIndex: PropTypes.number.isRequired,
    conflictType: PropTypes.oneOf(['exact', 'potential']).isRequired,
    existing: PropTypes.object.isRequired,
    incoming: PropTypes.object.isRequired,
    differences: PropTypes.arrayOf(PropTypes.string).isRequired
  })).isRequired,
  newEntries: PropTypes.array,
  resolutions: PropTypes.object.isRequired,
  onResolutionChange: PropTypes.func.isRequired,
  onSelectAll: PropTypes.func.isRequired
}

export default ConflictResolutionTable