"use client";

import React, { useState } from 'react';
import { 
  Settings, Save, Download, Play, Plus, Trash2, 
  Calendar, Filter, ArrowRight, Database, Table
} from 'lucide-react';
import { getCustomReport } from '../../../../../services/reportService';

export default function CustomReportBuilder() {
  const [reportName, setReportName] = useState('');
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<{field: string, direction: 'asc' | 'desc'}[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sample data sources
  const dataSources = [
    { id: 'sales', name: 'Sales' },
    { id: 'inventory', name: 'Inventory' },
    { id: 'customers', name: 'Customers' },
    { id: 'orders', name: 'Orders' },
    { id: 'gold_stock', name: 'Gold Stock' },
  ];
  
  // Sample fields for each data source
  const fieldsByDataSource: Record<string, any[]> = {
    sales: [
      { id: 'sale_id', name: 'Sale ID', type: 'number' },
      { id: 'sale_date', name: 'Sale Date', type: 'date' },
      { id: 'customer_id', name: 'Customer ID', type: 'number' },
      { id: 'customer_name', name: 'Customer Name', type: 'string' },
      { id: 'total_amount', name: 'Total Amount', type: 'currency' },
      { id: 'discount_amount', name: 'Discount Amount', type: 'currency' },
      { id: 'payment_method', name: 'Payment Method', type: 'string' },
    ],
    inventory: [
      { id: 'item_id', name: 'Item ID', type: 'number' },
      { id: 'item_name', name: 'Item Name', type: 'string' },
      { id: 'category_id', name: 'Category ID', type: 'number' },
      { id: 'category_name', name: 'Category Name', type: 'string' },
      { id: 'quantity', name: 'Quantity', type: 'number' },
      { id: 'unit_price', name: 'Unit Price', type: 'currency' },
      { id: 'buying_price', name: 'Buying Price', type: 'currency' },
    ],
    customers: [
      { id: 'customer_id', name: 'Customer ID', type: 'number' },
      { id: 'customer_name', name: 'Customer Name', type: 'string' },
      { id: 'email', name: 'Email', type: 'string' },
      { id: 'phone', name: 'Phone', type: 'string' },
      { id: 'address', name: 'Address', type: 'string' },
      { id: 'total_purchases', name: 'Total Purchases', type: 'number' },
      { id: 'total_spent', name: 'Total Spent', type: 'currency' },
    ],
    orders: [
      { id: 'order_id', name: 'Order ID', type: 'number' },
      { id: 'order_date', name: 'Order Date', type: 'date' },
      { id: 'customer_id', name: 'Customer ID', type: 'number' },
      { id: 'customer_name', name: 'Customer Name', type: 'string' },
      { id: 'total_amount', name: 'Total Amount', type: 'currency' },
      { id: 'advance_payment', name: 'Advance Payment', type: 'currency' },
      { id: 'remaining_balance', name: 'Remaining Balance', type: 'currency' },
      { id: 'status', name: 'Status', type: 'string' },
    ],
    gold_stock: [
      { id: 'stock_id', name: 'Stock ID', type: 'number' },
      { id: 'purity', name: 'Purity', type: 'string' },
      { id: 'quantity_in_grams', name: 'Quantity (g)', type: 'number' },
      { id: 'price_per_gram', name: 'Price per Gram', type: 'currency' },
      { id: 'total_value', name: 'Total Value', type: 'currency' },
    ],
  };
  
  // Filter operators
  const filterOperators = [
    { id: 'equals', name: 'Equals', types: ['string', 'number', 'date', 'currency'] },
    { id: 'not_equals', name: 'Not Equals', types: ['string', 'number', 'date', 'currency'] },
    { id: 'greater_than', name: 'Greater Than', types: ['number', 'date', 'currency'] },
    { id: 'less_than', name: 'Less Than', types: ['number', 'date', 'currency'] },
    { id: 'contains', name: 'Contains', types: ['string'] },
    { id: 'starts_with', name: 'Starts With', types: ['string'] },
    { id: 'ends_with', name: 'Ends With', types: ['string'] },
    { id: 'between', name: 'Between', types: ['number', 'date', 'currency'] },
    { id: 'in_list', name: 'In List', types: ['string', 'number'] },
  ];
  
  // Handle data source change
  const handleDataSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDataSource = e.target.value;
    setSelectedDataSource(newDataSource);
    setSelectedFields([]);
    setFilters([]);
    setGroupBy([]);
    setSortBy([]);
  };
  
  // Handle field selection
  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };
  
  // Add a new filter
  const addFilter = () => {
    if (selectedDataSource && fieldsByDataSource[selectedDataSource].length > 0) {
      const firstField = fieldsByDataSource[selectedDataSource][0];
      const validOperators = filterOperators.filter(op => op.types.includes(firstField.type));
      
      setFilters([
        ...filters,
        {
          field: firstField.id,
          operator: validOperators[0]?.id || 'equals',
          value: ''
        }
      ]);
    }
  };
  
  // Remove a filter
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };
  
  // Update filter field
  const updateFilterField = (index: number, field: string) => {
    const newFilters = [...filters];
    newFilters[index].field = field;
    
    // Reset operator if not compatible with new field type
    const fieldType = fieldsByDataSource[selectedDataSource].find(f => f.id === field)?.type;
    const isOperatorValid = filterOperators.find(op => 
      op.id === newFilters[index].operator && op.types.includes(fieldType)
    );
    
    if (!isOperatorValid) {
      const validOperator = filterOperators.find(op => op.types.includes(fieldType));
      newFilters[index].operator = validOperator?.id || 'equals';
    }
    
    setFilters(newFilters);
  };
  
  // Update filter operator
  const updateFilterOperator = (index: number, operator: string) => {
    const newFilters = [...filters];
    newFilters[index].operator = operator;
    setFilters(newFilters);
  };
  
  // Update filter value
  const updateFilterValue = (index: number, value: string) => {
    const newFilters = [...filters];
    newFilters[index].value = value;
    setFilters(newFilters);
  };
  
  // Toggle group by field
  const toggleGroupBy = (field: string) => {
    setGroupBy(prev => 
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };
  
  // Toggle sort by field
  const toggleSortBy = (field: string) => {
    setSortBy(prev => {
      const existing = prev.find(item => item.field === field);
      if (existing) {
        // Toggle direction or remove if already desc
        if (existing.direction === 'asc') {
          return prev.map(item => 
            item.field === field ? { ...item, direction: 'desc' } : item
          );
        } else {
          return prev.filter(item => item.field !== field);
        }
      } else {
        // Add new sort
        return [...prev, { field, direction: 'asc' }];
      }
    });
  };
  
  // Run report preview
  const runReportPreview = async () => {
    if (!selectedDataSource || selectedFields.length === 0) {
      alert('Please select a data source and at least one field');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const reportConfig = {
        dataSource: selectedDataSource,
        fields: selectedFields,
        filters,
        groupBy,
        sortBy
      };
      
      const result = await getCustomReport(reportConfig);
      
      // For demo purposes, generate some mock data
      const mockData = Array(10).fill(0).map((_, index) => {
        const row: Record<string, any> = { id: index + 1 };
        selectedFields.forEach(field => {
          const fieldInfo = fieldsByDataSource[selectedDataSource].find(f => f.id === field);
          if (fieldInfo) {
            switch (fieldInfo.type) {
              case 'number':
                row[field] = Math.floor(Math.random() * 1000);
                break;
              case 'currency':
                row[field] = (Math.random() * 10000).toFixed(2);
                break;
              case 'date':
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 30));
                row[field] = date.toISOString().split('T')[0];
                break;
              case 'string':
                row[field] = `Sample ${fieldInfo.name} ${index + 1}`;
                break;
              default:
                row[field] = `Value ${index + 1}`;
            }
          }
        });
        return row;
      });
      
      setPreviewData(mockData);
    } catch (error) {
      console.error('Error running report preview:', error);
      alert('Error generating report preview');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save report configuration
  const saveReport = () => {
    if (!reportName) {
      alert('Please enter a report name');
      return;
    }
    
    if (!selectedDataSource || selectedFields.length === 0) {
      alert('Please select a data source and at least one field');
      return;
    }
    
    // In a real implementation, this would save to the backend
    alert(`Report "${reportName}" saved successfully!`);
  };
  
  // Export report data
  const exportReport = () => {
    if (!previewData) {
      alert('Please run the report first');
      return;
    }
    
    // In a real implementation, this would trigger a CSV download
    alert('Report exported successfully!');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Custom Report Builder</h1>
        
        <div className="mt-3 sm:mt-0 flex items-center space-x-3">
          <button 
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            onClick={saveReport}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </button>
          
          <button 
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            onClick={exportReport}
            disabled={!previewData}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          
          <button 
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            onClick={runReportPreview}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-opacity-20 border-t-white rounded-full" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Report
          </button>
        </div>
      </div>
      
      {/* Report Configuration */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex items-center">
          <Settings className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg leading-6 font-medium text-gray-900">Report Configuration</h3>
        </div>
        
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Report Name */}
            <div className="sm:col-span-3">
              <label htmlFor="report-name" className="block text-sm font-medium text-gray-700">
                Report Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="report-name"
                  className="shadow-sm focus:ring-yellow-500 focus:border-yellow-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name"
                />
              </div>
            </div>
            
            {/* Data Source */}
            <div className="sm:col-span-3">
              <label htmlFor="data-source" className="block text-sm font-medium text-gray-700">
                Data Source
              </label>
              <div className="mt-1 relative">
                <select
                  id="data-source"
                  className="shadow-sm focus:ring-yellow-500 focus:border-yellow-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={selectedDataSource}
                  onChange={handleDataSourceChange}
                >
                  <option value="">Select a data source</option>
                  {dataSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
                <Database className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {selectedDataSource && (
        <>
          {/* Field Selection */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Select Fields</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose the fields you want to include in your report
              </p>
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {fieldsByDataSource[selectedDataSource].map((field) => (
                  <div key={field.id} className="flex items-center">
                    <input
                      id={`field-${field.id}`}
                      type="checkbox"
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleFieldToggle(field.id)}
                    />
                    <label htmlFor={`field-${field.id}`} className="ml-3 text-sm text-gray-700">
                      {field.name}
                      <span className="ml-1 text-xs text-gray-500">({field.type})</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Filters */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Filters</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add conditions to filter your report data
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                onClick={addFilter}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Filter
              </button>
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              {filters.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  No filters added yet. Click "Add Filter" to create one.
                </div>
              ) : (
                <div className="space-y-4">
                  {filters.map((filter, index) => {
                    const fieldInfo = fieldsByDataSource[selectedDataSource].find(f => f.id === filter.field);
                    const fieldType = fieldInfo?.type || 'string';
                    const validOperators = filterOperators.filter(op => op.types.includes(fieldType));
                    
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <select
                          className="shadow-sm focus:ring-yellow-500 focus:border-yellow-500 block sm:text-sm border-gray-300 rounded-md"
                          value={filter.field}
                          onChange={(e) => updateFilterField(index, e.target.value)}
                        >
                          {fieldsByDataSource[selectedDataSource].map((field) => (
                            <option key={field.id} value={field.id}>
                              {field.name}
                            </option>
                          ))}
                        </select>
                        
                        <select
                          className="shadow-sm focus:ring-yellow-500 focus:border-yellow-500 block sm:text-sm border-gray-300 rounded-md"
                          value={filter.operator}
                          onChange={(e) => updateFilterOperator(index, e.target.value)}
                        >
                          {validOperators.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.name}
                            </option>
                          ))}
                        </select>
                        
                        <input
                          type={fieldType === 'date' ? 'date' : 'text'}
                          className="shadow-sm focus:ring-yellow-500 focus:border-yellow-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={filter.value}
                          onChange={(e) => updateFilterValue(index, e.target.value)}
                          placeholder="Value"
                        />
                        
                        <button
                          type="button"
                          className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          onClick={() => removeFilter(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Group By & Sort By */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Group By */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Group By</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select fields to group your data by
                </p>
              </div>
              
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                {selectedFields.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Select fields first to enable grouping
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedFields.map((fieldId) => {
                      const field = fieldsByDataSource[selectedDataSource].find(f => f.id === fieldId);
                      if (!field) return null;
                      
                      return (
                        <div key={fieldId} className="flex items-center">
                          <input
                            id={`group-${fieldId}`}
                            type="checkbox"
                            className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                            checked={groupBy.includes(fieldId)}
                            onChange={() => toggleGroupBy(fieldId)}
                          />
                          <label htmlFor={`group-${fieldId}`} className="ml-3 text-sm text-gray-700">
                            {field.name}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Sort By */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Sort By</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select fields to sort your data by
                </p>
              </div>
              
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                {selectedFields.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Select fields first to enable sorting
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedFields.map((fieldId) => {
                      const field = fieldsByDataSource[selectedDataSource].find(f => f.id === fieldId);
                      if (!field) return null;
                      
                      const sortItem = sortBy.find(item => item.field === fieldId);
                      
                      return (
                        <div key={fieldId} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <input
                              id={`sort-${fieldId}`}
                              type="checkbox"
                              className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                              checked={!!sortItem}
                              onChange={() => toggleSortBy(fieldId)}
                            />
                            <label htmlFor={`sort-${fieldId}`} className="ml-3 text-sm text-gray-700">
                              {field.name}
                            </label>
                          </div>
                          
                          {sortItem && (
                            <span className="text-xs font-medium text-gray-500">
                              {sortItem.direction === 'asc' ? 'Ascending' : 'Descending'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Report Preview */}
      {previewData && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Report Preview</h3>
            <div className="flex space-x-2">
              <button className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Table className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="border-t border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {selectedFields.map((fieldId) => {
                    const field = fieldsByDataSource[selectedDataSource].find(f => f.id === fieldId);
                    return (
                      <th 
                        key={fieldId}
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {field?.name || fieldId}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {selectedFields.map((fieldId) => {
                      const field = fieldsByDataSource[selectedDataSource].find(f => f.id === fieldId);
                      const value = row[fieldId];
                      
                      let displayValue = value;
                      if (field?.type === 'currency' && !isNaN(parseFloat(value))) {
                        displayValue = `$${parseFloat(value).toFixed(2)}`;
                      }
                      
                      return (
                        <td key={fieldId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
