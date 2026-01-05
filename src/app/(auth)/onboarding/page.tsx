"use client"

import { useState } from "react"

export default function OnboardingPage() {
  const [agencyName, setAgencyName] = useState("")
  const [step, setStep] = useState(1)

  console.log('Agency name:', agencyName, 'Step:', step)

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Onboarding Test</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Agency Name:</label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => {
                console.log('Input changed:', e.target.value)
                setAgencyName(e.target.value)
              }}
              placeholder="Enter agency name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-600 mt-1">Current value: "{agencyName}"</p>
          </div>

          <button
            onClick={() => {
              console.log('Button clicked!')
              setStep(step + 1)
            }}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Continue (Step: {step})
          </button>
        </div>
      </div>
    </div>
  )
}
