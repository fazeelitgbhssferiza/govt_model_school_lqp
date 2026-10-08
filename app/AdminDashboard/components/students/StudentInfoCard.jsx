'use client';
import { useState } from 'react';
import Button from '../ui/Button';
import { formatDate, formatCurrency } from '../../../utils/helpers';

export default function StudentInfoCard({ 
  student, 
  onEdit, 
  onDelete, 
  onPrint,
  compact = false 
}) {
  const [showFullDetails, setShowFullDetails] = useState(false);

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowFullDetails(!showFullDetails)}>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {student.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{student.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reg: {student.regNo}</p>
                <p className="text-xs text-gray-500">{student.class} - {student.section}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                student.feeRecords?.[student.feeRecords.length - 1]?.status === 'Paid' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {student.feeRecords?.[student.feeRecords.length - 1]?.status || 'Not Set'}
              </span>
            </div>
          </div>
          
          {showFullDetails && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Father's Name:</p>
                  <p className="font-medium">{student.fatherName}</p>
                </div>
                <div>
                  <p className="text-gray-600">CNIC:</p>
                  <p className="font-mono text-sm">{student.cnic}</p>
                </div>
                <div>
                  <p className="text-gray-600">Date of Birth:</p>
                  <p>{formatDate(student.dob)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Monthly Fee:</p>
                  <p className="font-semibold">{formatCurrency(student.feeStructure?.monthlyFee || 0)}</p>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-3">
                <Button size="sm" variant="secondary" onClick={() => onEdit(student)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(student.id)}>Delete</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{student.name}</h2>
              <p className="text-blue-100">Registration No: {student.regNo}</p>
              <p className="text-blue-100">{student.class} - Section {student.section}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="secondary" size="sm" onClick={() => onPrint(student)}>
              🖨️ Print
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onEdit(student)}>
              ✏️ Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(student.id)}>
              🗑️ Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <span className="mr-2">👤</span> Personal Information
            </h3>
            <div className="space-y-2">
              <InfoRow label="Date of Birth" value={formatDate(student.dob)} />
              <InfoRow label="Gender" value={student.gender} />
              <InfoRow label="CNIC/B-Form" value={student.cnic} />
              <InfoRow label="Address" value={student.address} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <span className="mr-2">👨‍👩‍👧</span> Parent Information
            </h3>
            <div className="space-y-2">
              <InfoRow label="Father's Name" value={student.fatherName} />
              <InfoRow label="Father's CNIC" value={student.fatherCNIC} />
              <InfoRow label="Monthly Income" value={formatCurrency(student.monthlyIncome)} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <span className="mr-2">📚</span> Academic Information
            </h3>
            <div className="space-y-2">
              <InfoRow label="Enrollment Class" value={student.enrollmentClass} />
              <InfoRow label="Previous Class" value={student.previousClass || 'N/A'} />
              <InfoRow label="Previous School" value={student.previousSchool || 'N/A'} />
              <InfoRow label="Documents" value={student.documents?.join(', ') || 'None'} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <span className="mr-2">💰</span> Fee Information
            </h3>
            <div className="space-y-2">
              <InfoRow label="Registration Fee" value={formatCurrency(student.feeStructure?.registrationFee || 0)} />
              <InfoRow label="Monthly Fee" value={formatCurrency(student.feeStructure?.monthlyFee || 0)} />
              <InfoRow label="Discount" value={formatCurrency(student.feeStructure?.discount || 0)} />
              <InfoRow label="Total Payable" value={formatCurrency(student.feeStructure?.total || 0)} />
              <InfoRow label="Fee Mode" value={student.feeStructure?.mode || 'Monthly'} />
            </div>
          </div>
        </div>

        {/* Fee Status Timeline */}
        {student.feeRecords && student.feeRecords.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Fee Payment History
            </h3>
            <div className="space-y-2">
              {student.feeRecords.map((record, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium">{record.month} {record.year}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(record.amount)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      record.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      record.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {record.status}
                    </span>
                    {record.paidDate && (
                      <p className="text-xs text-gray-500 mt-1">Paid: {formatDate(record.paidDate)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Academic Results Summary */}
        {student.results && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Academic Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(student.results).map(([term, results]) => (
                results && (
                  <div key={term} className="p-3 border rounded-lg">
                    <p className="font-semibold capitalize mb-2">
                      {term === 'firstTerm' ? 'First Term' : term === 'secondTerm' ? 'Second Term' : 'Final Term'}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Total:</span>
                        <span className="font-semibold">{results.total}/{(Object.keys(results).length - 2) * 100}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Percentage:</span>
                        <span className="font-semibold">{results.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-green-500 rounded-full h-2 transition-all"
                          style={{ width: `${results.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-1 border-b dark:border-gray-700 last:border-0">
    <span className="text-sm text-gray-600 dark:text-gray-400">{label}:</span>
    <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
  </div>
);