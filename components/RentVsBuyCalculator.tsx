import React, { useState, useMemo } from 'react';

interface RentVsBuyCalculatorProps {
  propertyPrice: number;
}

const RentVsBuyCalculator: React.FC<RentVsBuyCalculatorProps> = ({ propertyPrice }) => {
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [interestRate, setInterestRate] = useState(3.75);
  const [loanTerm, setLoanTerm] = useState(25);
  const [annualRentPct, setAnnualRentPct] = useState(6);

  const calculations = useMemo(() => {
    const loanAmount = propertyPrice * (1 - downPaymentPct / 100);
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    
    // Mortgage formula: [P * r * (1 + r)^n] / [(1 + r)^n – 1]
    const monthlyMortgage = 
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    const monthlyRent = (propertyPrice * (annualRentPct / 100)) / 12;
    
    return {
      monthlyMortgage,
      monthlyRent,
      loanAmount,
      totalDownPayment: propertyPrice * (downPaymentPct / 100)
    };
  }, [propertyPrice, downPaymentPct, interestRate, loanTerm, annualRentPct]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-blue-50/30 border border-blue-100/50 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-widest">
          Rent vs Buy Calculator
        </h3>
        <span className="text-[9px] font-bold text-blue-400 uppercase bg-white px-2 py-0.5 rounded-full border border-blue-50">
          Est. Market Rates
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Monthly Buy</p>
          <p className="text-lg font-black text-emerald-700">{formatCurrency(calculations.monthlyMortgage)}</p>
          <p className="text-[9px] text-gray-400 font-medium">Mortgage (P+I)</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Monthly Rent</p>
          <p className="text-lg font-black text-blue-800">{formatCurrency(calculations.monthlyRent)}</p>
          <p className="text-[9px] text-gray-400 font-medium">Estimated Market Rent</p>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Down Payment</label>
            <span className="text-[10px] font-black text-emerald-600">{downPaymentPct}% ({formatCurrency(calculations.totalDownPayment)})</span>
          </div>
          <input 
            type="range" 
            min="20" 
            max="80" 
            step="5"
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Interest Rate</label>
            <span className="text-[10px] font-black text-blue-800">{interestRate}%</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="10" 
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-800"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-blue-100 flex justify-center">
        <button className="bg-blue-800 text-gray-100 text-[9px] font-black uppercase tracking-widest py-2 px-6 rounded-full hover:bg-blue-900 transition-colors shadow-lg active:scale-95">
          View Detailed Amortization
        </button>
      </div>
    </div>
  );
};

export default RentVsBuyCalculator;