"use client";

/**
 * @file components/features/SplitModal.tsx
 * @description Split configuration modal for transactions with real-time synchronization
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Calculator, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Transaction, SplitType, SplitDetail } from '@/types';
import { useParticipantStore } from '@/store/participantStore';
import { logger } from '@/lib/logger';

interface SplitModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Transaction>) => void;
}

interface ValidationState {
  isValid: boolean;
  message: string;
  difference: number;
}

export function SplitModal({ transaction, isOpen, onClose, onSave }: SplitModalProps) {
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitDetails, setSplitDetails] = useState<SplitDetail[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, number>>({});
  
  // Transaction details
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [paidBy, setPaidBy] = useState('');
  
  // Get all group participants from store
  const { participants: allGroupParticipants } = useParticipantStore();

  useEffect(() => {
    if (transaction) {
      setSplitType(transaction.splitType);
      setSelectedParticipants(transaction.participants);
      setSplitDetails(transaction.splitDetails);
      setDescription(transaction.description);
      setAmount(transaction.amount);
      setPaidBy(transaction.paidBy);
      
      // Initialize custom values from split details
      const values: Record<string, number> = {};
      transaction.splitDetails.forEach(d => {
        if (d.amount !== undefined) values[d.participant] = d.amount;
        if (d.percentage !== undefined) values[d.participant] = d.percentage;
        if (d.shares !== undefined) values[d.participant] = d.shares;
      });
      setCustomValues(values);
    }
  }, [transaction]);

  // Recalculate split details when amount changes
  useEffect(() => {
    if (transaction && selectedParticipants.length > 0) {
      updateSplitDetails(selectedParticipants, splitType, customValues, true);
    }
  }, [amount]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Calculate validation state based on split type
   * NOTE: Must be before any conditional returns to follow React Hooks rules
   */
  const validation: ValidationState = useMemo(() => {
    if (!transaction || selectedParticipants.length === 0) {
      return { isValid: true, message: '', difference: 0 };
    }

    const totalAmount = amount || 0;

    switch (splitType) {
      case 'percentage': {
        const totalPercentage = selectedParticipants.reduce(
          (sum, p) => sum + (customValues[p] || 0), 
          0
        );
        const diff = Math.round((totalPercentage - 100) * 100) / 100;
        if (Math.abs(diff) < 0.01) {
          return { isValid: true, message: 'Total: 100%', difference: 0 };
        }
        return {
          isValid: diff > -0.01,
          message: `Total: ${totalPercentage.toFixed(1)}% (${diff > 0 ? '+' : ''}${diff.toFixed(1)}%)`,
          difference: diff
        };
      }

      case 'fixed': {
        const totalFixed = selectedParticipants.reduce(
          (sum, p) => sum + (customValues[p] || 0),
          0
        );
        const diff = Math.round((totalFixed - totalAmount) * 100) / 100;
        
        // Check if any individual amount exceeds total
        const exceedsTotal = selectedParticipants.some(p => (customValues[p] || 0) > totalAmount);
        if (exceedsTotal) {
          return {
            isValid: false,
            message: `⚠️ Amount exceeds total ₹${totalAmount.toFixed(2)}`,
            difference: diff
          };
        }
        
        if (Math.abs(diff) < 0.01) {
          return { isValid: true, message: `Total: ₹${totalFixed.toFixed(2)} ✓`, difference: 0 };
        }
        return {
          isValid: false,
          message: `Total: ₹${totalFixed.toFixed(2)} (${diff > 0 ? '+' : ''}₹${diff.toFixed(2)})`,
          difference: diff
        };
      }

      case 'shares': {
        const totalShares = selectedParticipants.reduce(
          (sum, p) => sum + (customValues[p] || 1), 
          0
        );
        return {
          isValid: true,
          message: `Total: ${totalShares} shares`,
          difference: 0
        };
      }

      default:
        return { isValid: true, message: '', difference: 0 };
    }
  }, [splitType, customValues, selectedParticipants, amount]);

  /**
   * Calculate split amounts based on current values
   */
  const calculateSplitAmounts = (
    parts: string[],
    type: SplitType,
    values: Record<string, number>
  ): Map<string, number> => {
    const currentAmount = amount || 0;
    const amounts = new Map<string, number>();

    switch (type) {
      case 'equal': {
        const baseAmount = currentAmount / parts.length;
        parts.forEach(part => {
          amounts.set(part, Math.round(baseAmount * 100) / 100);
        });
        break;
      }

      case 'percentage': {
        parts.forEach(part => {
          const percentage = values[part] !== undefined ? values[part] : 100 / parts.length;
          const calcAmount = (currentAmount * percentage) / 100;
          amounts.set(part, Math.round(calcAmount * 100) / 100);
        });
        break;
      }

      case 'fixed': {
        parts.forEach(part => {
          const fixedAmount = values[part] !== undefined ? values[part] : currentAmount / parts.length;
          amounts.set(part, Math.round(fixedAmount * 100) / 100);
        });
        break;
      }

      case 'shares': {
        const totalShares = parts.reduce((sum, p) => sum + (values[p] || 1), 0);
        parts.forEach(part => {
          const shares = values[part] !== undefined ? values[part] : 1;
          const calcAmount = (currentAmount * shares) / totalShares;
          amounts.set(part, Math.round(calcAmount * 100) / 100);
        });
        break;
      }
    }

    return amounts;
  };

  const handleToggleParticipant = (participant: string, checked: boolean) => {
    let updatedParticipants: string[];
    if (checked) {
      updatedParticipants = [...selectedParticipants, participant];
    } else {
      updatedParticipants = selectedParticipants.filter(p => p !== participant);
    }
    
    setSelectedParticipants(updatedParticipants);
    
    // Initialize default values for new participants
    const newValues = { ...customValues };
    if (checked && newValues[participant] === undefined) {
      if (splitType === 'percentage') newValues[participant] = 100 / updatedParticipants.length;
      else if (splitType === 'shares') newValues[participant] = 1;
      else newValues[participant] = amount / updatedParticipants.length;
    }
    
    // Redistribute values for remaining participants
    if (splitType === 'percentage' && updatedParticipants.length > 0) {
      const remainingPercent = 100;
      const perPerson = remainingPercent / updatedParticipants.length;
      updatedParticipants.forEach(p => {
        if (newValues[p] === undefined) newValues[p] = perPerson;
      });
    }
    
    setCustomValues(newValues);
    updateSplitDetails(updatedParticipants, splitType, newValues, true);
    
    logger.debug('ui', `Participant ${participant} ${checked ? 'added' : 'removed'}`, {
      transactionId: transaction?.id,
      participantCount: updatedParticipants.length,
      isPayer: participant === transaction?.paidBy
    });
  };

  const updateSplitDetails = (
    parts: string[],
    type: SplitType,
    values: Record<string, number>,
    recalculateValues: boolean = false
  ) => {
    const currentAmount = amount || 0;
    const amounts = calculateSplitAmounts(parts, type, values);
    
    const details: SplitDetail[] = parts.map(part => {
      let detail: SplitDetail = { 
        participant: part,
        amount: amounts.get(part) || 0
      };
      
      switch (type) {
        case 'percentage':
          detail.percentage = values[part] !== undefined ? values[part] : 100 / parts.length;
          break;
        case 'shares':
          detail.shares = values[part] !== undefined ? Math.round(values[part]) : 1;
          break;
        case 'fixed':
          // Amount already set
          break;
      }
      
      return detail;
    });
    
    setSplitDetails(details);
    
    // If recalculating, update the displayed values too
    if (recalculateValues && type === 'percentage') {
      const newValues: Record<string, number> = {};
      details.forEach(d => {
        if (d.percentage !== undefined) {
          newValues[d.participant] = Math.round(d.percentage * 100) / 100;
        }
      });
      setCustomValues(prev => ({ ...prev, ...newValues }));
    }
  };

  const handleSplitTypeChange = (newType: SplitType) => {
    setSplitType(newType);
    
    // Reset custom values for new split type
    const defaultValues: Record<string, number> = {};
    const currentAmount = amount || 0;
    
    if (selectedParticipants.length > 0) {
      if (newType === 'percentage') {
        const perPerson = 100 / selectedParticipants.length;
        selectedParticipants.forEach(p => defaultValues[p] = perPerson);
      } else if (newType === 'shares') {
        selectedParticipants.forEach(p => defaultValues[p] = 1);
      } else {
        const perPerson = currentAmount / selectedParticipants.length;
        selectedParticipants.forEach(p => defaultValues[p] = perPerson);
      }
    }
    
    setCustomValues(defaultValues);
    updateSplitDetails(selectedParticipants, newType, defaultValues, true);
    
    logger.debug('ui', `Split type changed to ${newType}`, {
      transactionId: transaction?.id
    });
  };

  /**
   * Handle custom value changes with auto-synchronization
   */
  const handleCustomValueChange = (participant: string, value: number) => {
    const currentAmount = amount || 0;
    const otherParticipants = selectedParticipants.filter(p => p !== participant);
    
    let newValues: Record<string, number>;

    switch (splitType) {
      case 'percentage': {
        // When one percentage changes, auto-adjust others proportionally
        const remainingParticipants = otherParticipants;
        const newValue = Math.max(0, Math.min(100, value)); // Clamp between 0-100
        const remainingPercent = 100 - newValue;
        
        newValues = { 
          ...customValues, 
          [participant]: Math.round(newValue * 100) / 100 
        };
        
        if (remainingParticipants.length > 0 && remainingPercent >= 0) {
          // Distribute remaining proportionally based on current values
          const currentOthersTotal = remainingParticipants.reduce(
            (sum, p) => sum + (customValues[p] || 0), 
            0
          ) || remainingParticipants.length;
          
          remainingParticipants.forEach(p => {
            const currentShare = (customValues[p] || 0) / currentOthersTotal;
            newValues[p] = Math.round(remainingPercent * currentShare * 100) / 100;
          });
          
          // Fix rounding errors on last participant
          const currentTotal = Object.values(newValues).reduce((sum, v) => sum + v, 0);
          const lastParticipant = remainingParticipants[remainingParticipants.length - 1];
          if (Math.abs(currentTotal - 100) > 0.01) {
            newValues[lastParticipant] = Math.round(
              (newValues[lastParticipant] + (100 - currentTotal)) * 100
            ) / 100;
          }
        }
        break;
      }

      case 'fixed': {
        // For fixed amounts, auto-adjust others to maintain total
        const newValue = Math.max(0, value);
        
        newValues = {
          ...customValues,
          [participant]: Math.round(newValue * 100) / 100
        };
        
        // Check if exceeds total - if so, show warning but don't auto-adjust
        if (newValue > currentAmount) {
          // Amount exceeds total - just update this value, validation will show error
          break;
        }
        
        const remainingAmount = currentAmount - newValue;
        const remainingParticipants = otherParticipants;
        
        if (remainingParticipants.length > 0) {
          // Check if other participants all have 0 values
          const currentOthersTotal = remainingParticipants.reduce(
            (sum, p) => sum + (customValues[p] || 0),
            0
          );
          
          if (currentOthersTotal === 0) {
            // All others are 0 - distribute equally
            const equalShare = remainingAmount / remainingParticipants.length;
            remainingParticipants.forEach(p => {
              newValues[p] = Math.round(equalShare * 100) / 100;
            });
          } else {
            // Distribute proportionally based on current values
            remainingParticipants.forEach(p => {
              const currentShare = (customValues[p] || 0) / currentOthersTotal;
              newValues[p] = Math.round(remainingAmount * currentShare * 100) / 100;
            });
          }
          
          // Fix rounding errors on last participant
          const currentTotal = Object.values(newValues).reduce((sum, v) => sum + v, 0);
          const lastParticipant = remainingParticipants[remainingParticipants.length - 1];
          if (Math.abs(currentTotal - currentAmount) > 0.01) {
            newValues[lastParticipant] = Math.round(
              (newValues[lastParticipant] + (currentAmount - currentTotal)) * 100
            ) / 100;
          }
        }
        break;
      }

      case 'shares': {
        // For shares, allow 0 or empty, amounts recalculate automatically
        // Use value as-is (can be 0), default to 0 if NaN
        const shareValue = isNaN(value) ? 0 : Math.max(0, Math.round(value));
        newValues = {
          ...customValues,
          [participant]: shareValue
        };
        break;
      }

      default:
        newValues = { ...customValues, [participant]: value };
    }

    setCustomValues(newValues);
    updateSplitDetails(selectedParticipants, splitType, newValues, false);
  };

  const handleSave = () => {
    if (!transaction) return;
    
    logger.info('ui', 'Saving transaction with split configuration', {
      transactionId: transaction.id,
      description,
      amount,
      paidBy,
      splitType,
      participantCount: selectedParticipants.length,
      splitDetails
    });
    
    onSave(transaction.id, {
      description,
      amount,
      paidBy,
      splitType,
      participants: selectedParticipants,
      splitDetails,
    });
    onClose();
  };

  const calculatePreview = (participant: string): string => {
    const detail = splitDetails.find(d => d.participant === participant);
    if (!detail) return '';
    
    switch (splitType) {
      case 'equal':
        return `₹${detail.amount?.toFixed(2)}`;
      case 'percentage':
        return `${customValues[participant]?.toFixed(1)}% → ₹${detail.amount?.toFixed(2)}`;
      case 'fixed':
        return `₹${customValues[participant]?.toFixed(2)}`;
      case 'shares':
        const shares = customValues[participant] ?? 1;
        return `${shares} shares → ₹${detail.amount?.toFixed(2)}`;
      default:
        return '';
    }
  };

  const getValidationColor = () => {
    if (!validation.message) return 'text-gray-500';
    if (validation.isValid && Math.abs(validation.difference) < 0.01) return 'text-green-500';
    if (splitType === 'percentage' && Math.abs(validation.difference) < 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getValidationIcon = () => {
    if (!validation.message) return null;
    if (validation.isValid && Math.abs(validation.difference) < 0.01) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#F5C518]" />
            Configure Split
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Details - Editable */}
          <div className="p-4 bg-[#2a2a2a] rounded-lg space-y-3">
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
                className="bg-[#1a1a1a] border-[#333] text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-400 mb-1 block">Amount (₹)</Label>
                <Input
                  type="number"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="bg-[#1a1a1a] border-[#333] text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400 mb-1 block">Paid By</Label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-[#1a1a1a] border border-[#333] text-white text-sm"
                >
                  <option value="">Select payer...</option>
                  {allGroupParticipants.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Split Type Tabs */}
          <Tabs value={splitType} onValueChange={(v) => handleSplitTypeChange(v as SplitType)}>
            <TabsList className="grid grid-cols-4 bg-[#2a2a2a]">
              <TabsTrigger value="equal" className="data-[state=active]:bg-[#F5C518] data-[state=active]:text-[#0f0f0f]">
                Equal
              </TabsTrigger>
              <TabsTrigger value="percentage" className="data-[state=active]:bg-[#F5C518] data-[state=active]:text-[#0f0f0f]">
                %
              </TabsTrigger>
              <TabsTrigger value="fixed" className="data-[state=active]:bg-[#F5C518] data-[state=active]:text-[#0f0f0f]">
                Fixed
              </TabsTrigger>
              <TabsTrigger value="shares" className="data-[state=active]:bg-[#F5C518] data-[state=active]:text-[#0f0f0f]">
                Shares
              </TabsTrigger>
            </TabsList>

            <TabsContent value="equal" className="mt-4">
              <p className="text-sm text-gray-400">
                Split equally among all selected participants.
                <span className="text-[#F5C518] ml-1">
                  Each pays: ₹{selectedParticipants.length > 0 
                    ? ((amount || 0) / selectedParticipants.length).toFixed(2) 
                    : '0.00'}
                </span>
              </p>
            </TabsContent>

            <TabsContent value="percentage" className="mt-4">
              <p className="text-sm text-gray-400">
                Split by percentage. Adjust one and others auto-sync to total 100%.
              </p>
            </TabsContent>

            <TabsContent value="fixed" className="mt-4">
              <p className="text-sm text-gray-400">
                Set exact amounts for each participant. Total must equal ₹{(amount || 0).toFixed(2)}.
              </p>
            </TabsContent>

            <TabsContent value="shares" className="mt-4">
              <p className="text-sm text-gray-400">
                Split by shares (e.g., 2 shares = twice the amount). Amounts auto-calculate.
              </p>
            </TabsContent>
          </Tabs>

          {/* Participants - Show all group participants with checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-gray-300 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participants
              </Label>
              <span className="text-xs text-gray-500">
                {selectedParticipants.length} selected
              </span>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto border border-[#2a2a2a] rounded-lg p-2">
              {allGroupParticipants.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No group participants defined. Please set up your group first.
                </p>
              ) : (
                allGroupParticipants.map((participant) => {
                  const isSelected = selectedParticipants.includes(participant);
                  const isPayer = participant === transaction?.paidBy;
                  
                  return (
                    <motion.div
                      key={participant}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isSelected ? 'bg-[#2a2a2a]' : 'bg-transparent hover:bg-[#222]'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleParticipant(participant, checked as boolean)}
                          className="border-[#F5C518] data-[state=checked]:bg-[#F5C518]"
                        />
                        <span className={`${isSelected ? 'text-white' : 'text-gray-400'}`}>
                          {participant}
                        </span>
                        {isPayer && (
                          <span className="text-xs text-[#F5C518]">(payer)</span>
                        )}
                      </div>
                      
                      {/* Show preview of split amount */}
                      {isSelected && (
                        <span className="text-sm text-gray-400 font-mono">
                          {calculatePreview(participant)}
                        </span>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
            
            {/* Custom Value Inputs for Percentage/Fixed/Shares */}
            {splitType !== 'equal' && selectedParticipants.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-400">
                    {splitType === 'percentage' && 'Enter percentages (auto-syncs to 100%):'}
                    {splitType === 'fixed' && `Enter amounts (total should be ₹${(amount || 0).toFixed(2)}):`}
                    {splitType === 'shares' && 'Enter shares (amounts auto-calculate):'}
                  </Label>
                  {validation.message && (
                    <div className={`flex items-center gap-1 text-sm ${getValidationColor()}`}>
                      {getValidationIcon()}
                      {validation.message}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {selectedParticipants.map(participant => (
                    <CustomValueInput
                      key={`${splitType}-${participant}`}
                      participant={participant}
                      value={customValues[participant] ?? 0}
                      splitType={splitType}
                      onChange={handleCustomValueChange}
                      hasValidationError={splitType === 'fixed' && validation.difference !== 0}
                    />
                  ))}
                </div>
                
                {/* Validation Warning for Fixed Amounts */}
                {splitType === 'fixed' && Math.abs(validation.difference) > 0.01 && (
                  <div className={`text-xs p-2 rounded ${
                    Math.abs(validation.difference) < 1 
                      ? 'bg-yellow-950/30 text-yellow-400' 
                      : 'bg-red-950/30 text-red-400'
                  }`}>
                    {Math.abs(validation.difference) < 1 
                      ? `⚠️ Amounts differ by ₹${Math.abs(validation.difference).toFixed(2)} from total`
                      : `❌ Amounts don't add up to ₹${(amount || 0).toFixed(2)}. Difference: ₹${validation.difference.toFixed(2)}`
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#2a2a2a]">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-[#333] text-gray-300 hover:bg-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedParticipants.length === 0 || (splitType === 'fixed' && Math.abs(validation.difference) > 0.01)}
              className="flex-1 btn-gold"
            >
              Save Split
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Custom value input component with local state for better UX
 */
interface CustomValueInputProps {
  participant: string;
  value: number;
  splitType: SplitType;
  onChange: (participant: string, value: number) => void;
  hasValidationError?: boolean;
}

function CustomValueInput({ 
  participant, 
  value, 
  splitType, 
  onChange,
  hasValidationError 
}: CustomValueInputProps) {
  // Use local state for input value to allow temporary invalid states during typing
  const [inputValue, setInputValue] = useState<string>(value.toString());
  const [isEditing, setIsEditing] = useState(false);

  // Update local state when prop value changes (from parent calculations)
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Treat empty input as 0 to trigger recalculation
    if (newValue === '' || newValue === '-') {
      onChange(participant, 0);
    } else {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue)) {
        onChange(participant, numValue);
      }
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Reset to actual value on blur
    setInputValue(value.toString());
  };

  const getPlaceholder = () => {
    switch (splitType) {
      case 'percentage': return '%';
      case 'shares': return '#';
      case 'fixed': return '₹';
      default: return '';
    }
  };

  const getStep = () => {
    switch (splitType) {
      case 'percentage': return '0.1';
      case 'shares': return '1';
      case 'fixed': return '0.01';
      default: return '1';
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-[#2a2a2a] rounded">
      <span className="text-sm text-gray-400 w-20 truncate">{participant}</span>
      <Input
        type="number"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`bg-[#1a1a1a] border-[#333] text-white h-8 text-sm ${
          hasValidationError ? 'border-yellow-600/50' : ''
        }`}
        placeholder={getPlaceholder()}
        min={0}
        max={splitType === 'percentage' ? 100 : undefined}
        step={getStep()}
      />
    </div>
  );
}
