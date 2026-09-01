import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsAPI, customersAPI, roomsAPI } from '../api';
import { Room, Customer } from '../types';
import { formatCurrency } from '../utils';
import { FormField } from '../components/ui';
import toast from 'react-hot-toast';
import { differenceInDays, parseISO, format } from 'date-fns';
import { Search, CalendarDays, User, CreditCard, CheckCircle } from 'lucide-react';

const CreateBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Step state
  const [step, setStep] = useState(1);

  // Form fields
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState('');
  const [numGuests, setNumGuests] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '', mobile: '', email: '', address: '', id_proof_type: 'AADHAAR', id_proof_number: ''
  });
  const [useNewCustomer, setUseNewCustomer] = useState(false);
  const [roomRate, setRoomRate] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [bookingSource, setBookingSource] = useState('WALK_IN');
  const [specialRequests, setSpecialRequests] = useState('');

  // Derived
  const numDays = checkIn && checkOut ? differenceInDays(parseISO(checkOut), parseISO(checkIn)) : 0;
  const roomAmount = roomRate * numDays;
  const totalAmount = roomAmount + additionalCharges - discount;
  const pendingAmount = totalAmount - advanceAmount;

  // Fetch available rooms
  const { data: availableRooms = [], isFetching: roomsLoading } = useQuery({
    queryKey: ['available-rooms', checkIn, checkOut],
    queryFn: () => roomsAPI.checkAvailability({ check_in_date: checkIn, check_out_date: checkOut }).then(r => r.data.data as Room[]),
    enabled: !!checkIn && !!checkOut && numDays > 0,
  });

  // Customer search
  const { data: customers = [] } = useQuery({
    queryKey: ['customer-search', customerSearch],
    queryFn: () => customersAPI.getAll({ search: customerSearch, limit: 5 }).then(r => r.data.data as Customer[]),
    enabled: customerSearch.length > 2,
  });

  useEffect(() => {
    if (selectedRoom) {
      setRoomRate(selectedRoom.base_price);
      setAdvanceAmount(0);
    }
  }, [selectedRoom]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create customer if new
      let customerId = selectedCustomer?.id;
      if (useNewCustomer || !customerId) {
        const custRes = await customersAPI.create(newCustomer);
        customerId = custRes.data.data.id;
      }
      return bookingsAPI.create({ ...data, customer_id: customerId });
    },
    onSuccess: (res) => {
      toast.success(`Booking ${res.data.data.booking_id} created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/bookings/${res.data.data.booking_id}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create booking'),
  });

  const handleSubmit = () => {
    if (!selectedRoom) { toast.error('Please select a room'); return; }
    if (!selectedCustomer && !useNewCustomer) { toast.error('Please select or add a customer'); return; }
    if (useNewCustomer && (!newCustomer.name || !newCustomer.mobile)) { toast.error('Customer name and mobile are required'); return; }

    createMutation.mutate({
      room_id: selectedRoom.id,
      check_in_date: checkIn,
      check_out_date: checkOut,
      num_guests: numGuests,
      room_rate: roomRate,
      additional_charges: additionalCharges,
      discount: discount,
      advance_amount: advanceAmount,
      payment_method: paymentMethod,
      booking_source: bookingSource,
      special_requests: specialRequests,
    });
  };

  const steps = [
    { num: 1, label: 'Dates & Room', icon: CalendarDays },
    { num: 2, label: 'Customer', icon: User },
    { num: 3, label: 'Payment', icon: CreditCard },
    { num: 4, label: 'Confirm', icon: CheckCircle },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Steps */}
      <div className="flex items-center justify-center gap-0">
        {steps.map((s, idx) => (
          <React.Fragment key={s.num}>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-colors ${
                step === s.num ? 'bg-indigo-600 text-white' : step > s.num ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
              onClick={() => step > s.num && setStep(s.num)}
            >
              <s.icon className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:block">{s.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 w-8 ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Dates & Room */}
      {step === 1 && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-gray-900 text-lg">Select Dates & Room</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Check-in Date" required>
              <input
                type="date"
                className="input"
                value={checkIn}
                min={today}
                onChange={e => setCheckIn(e.target.value)}
              />
            </FormField>
            <FormField label="Check-out Date" required>
              <input
                type="date"
                className="input"
                value={checkOut}
                min={checkIn || today}
                onChange={e => setCheckOut(e.target.value)}
              />
            </FormField>
            <FormField label="Number of Guests">
              <input
                type="number"
                className="input"
                value={numGuests}
                min={1}
                max={6}
                onChange={e => setNumGuests(Number(e.target.value))}
              />
            </FormField>
          </div>

          {numDays > 0 && (
            <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700">
              Duration: <strong>{numDays} night{numDays > 1 ? 's' : ''}</strong>
            </div>
          )}

          {numDays > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-3">
                Available Rooms {roomsLoading && <span className="text-gray-400 text-sm">(Loading...)</span>}
              </h3>
              {availableRooms.length === 0 && !roomsLoading && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
                  No rooms available for the selected dates.
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {availableRooms.map(room => (
                  <div
                    key={room.id}
                    className={`rounded-xl border-2 p-3 cursor-pointer transition-all ${
                      selectedRoom?.id === room.id
                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <p className="text-lg font-bold">{room.room_number}</p>
                    <p className="text-xs text-gray-500">Floor {room.floor_number} • {room.room_type}</p>
                    <p className="text-sm font-semibold text-indigo-600 mt-1">{formatCurrency(room.base_price)}/night</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              className="btn-primary"
              disabled={!selectedRoom || numDays <= 0}
              onClick={() => setStep(2)}
            >
              Next: Customer Details →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Customer */}
      {step === 2 && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-gray-900 text-lg">Customer Details</h2>

          <div className="flex gap-3">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!useNewCustomer ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setUseNewCustomer(false)}
            >
              Existing Customer
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${useNewCustomer ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setUseNewCustomer(true)}
            >
              New Customer
            </button>
          </div>

          {!useNewCustomer ? (
            <div>
              <FormField label="Search Customer">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input pl-9"
                    placeholder="Name, mobile..."
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); }}
                  />
                </div>
              </FormField>
              {customers.length > 0 && !selectedCustomer && (
                <div className="border border-gray-200 rounded-lg overflow-hidden mt-2">
                  {customers.map(c => (
                    <button
                      key={c.id}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); }}
                    >
                      <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-indigo-700">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.mobile}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-900">{selectedCustomer.name}</p>
                      <p className="text-sm text-green-700">{selectedCustomer.mobile}</p>
                      {selectedCustomer.email && <p className="text-sm text-green-700">{selectedCustomer.email}</p>}
                    </div>
                    <button className="text-green-600 hover:text-green-800 text-sm" onClick={() => setSelectedCustomer(null)}>Change</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name" required>
                <input className="input" value={newCustomer.name} onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Customer name" />
              </FormField>
              <FormField label="Mobile Number" required>
                <input className="input" value={newCustomer.mobile} onChange={e => setNewCustomer(p => ({ ...p, mobile: e.target.value }))} placeholder="10-digit mobile" />
              </FormField>
              <FormField label="Email">
                <input className="input" type="email" value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
              </FormField>
              <FormField label="Address">
                <input className="input" value={newCustomer.address} onChange={e => setNewCustomer(p => ({ ...p, address: e.target.value }))} placeholder="Address" />
              </FormField>
              <FormField label="ID Proof Type">
                <select className="select" value={newCustomer.id_proof_type} onChange={e => setNewCustomer(p => ({ ...p, id_proof_type: e.target.value }))}>
                  <option value="AADHAAR">Aadhaar</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="VOTER_ID">Voter ID</option>
                  <option value="OTHER">Other</option>
                </select>
              </FormField>
              <FormField label="ID Proof Number">
                <input className="input" value={newCustomer.id_proof_number} onChange={e => setNewCustomer(p => ({ ...p, id_proof_number: e.target.value }))} placeholder="ID number" />
              </FormField>
            </div>
          )}

          <FormField label="Booking Source">
            <select className="select" value={bookingSource} onChange={e => setBookingSource(e.target.value)}>
              <option value="WALK_IN">Walk-in</option>
              <option value="PHONE">Phone</option>
              <option value="WEBSITE">Website</option>
              <option value="ONLINE">Online</option>
              <option value="OTHER">Other</option>
            </select>
          </FormField>
          <FormField label="Special Requests">
            <textarea className="input" rows={2} value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder="Any special requests..." />
          </FormField>

          <div className="flex gap-3 justify-between">
            <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button
              className="btn-primary"
              disabled={!selectedCustomer && (!useNewCustomer || !newCustomer.name || !newCustomer.mobile)}
              onClick={() => setStep(3)}
            >
              Next: Payment →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 3 && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-gray-900 text-lg">Pricing & Payment</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Room Rate per Night">
              <input
                type="number"
                className="input"
                value={roomRate}
                onChange={e => setRoomRate(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Additional Charges">
              <input
                type="number"
                className="input"
                value={additionalCharges}
                onChange={e => setAdditionalCharges(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Discount">
              <input
                type="number"
                className="input"
                value={discount}
                onChange={e => setDiscount(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Advance Amount">
              <input
                type="number"
                className="input"
                value={advanceAmount}
                max={totalAmount}
                onChange={e => setAdvanceAmount(Number(e.target.value))}
              />
            </FormField>
            <FormField label="Payment Method">
              <select className="select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online</option>
                <option value="OTHER">Other</option>
              </select>
            </FormField>
          </div>

          {/* Calculation summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 mb-3">Billing Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Room Rate</span>
              <span>{formatCurrency(roomRate)} × {numDays} nights</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Room Amount</span>
              <span className="font-medium">{formatCurrency(roomAmount)}</span>
            </div>
            {additionalCharges > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Additional Charges</span>
                <span>+ {formatCurrency(additionalCharges)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="text-green-600">- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-gray-200 pt-2">
              <span>Total Amount</span>
              <span className="text-indigo-600">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Advance Paid</span>
              <span className="text-green-600">{formatCurrency(advanceAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className={pendingAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                {pendingAmount > 0 ? 'Pending Amount' : 'Fully Paid'}
              </span>
              <span className={pendingAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                {formatCurrency(Math.max(0, pendingAmount))}
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-between">
            <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
            <button className="btn-primary" onClick={() => setStep(4)}>
              Review Booking →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-gray-900 text-lg">Confirm Booking</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 border-b pb-2">Room Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Room</span><span className="font-medium">{selectedRoom?.room_number}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Floor</span><span className="font-medium">{selectedRoom?.floor_number}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Check-in</span><span className="font-medium">{checkIn}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Check-out</span><span className="font-medium">{checkOut}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium">{numDays} nights</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Guests</span><span className="font-medium">{numGuests}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="font-medium">{bookingSource}</span></div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 border-b pb-2">Customer</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{useNewCustomer ? newCustomer.name : selectedCustomer?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Mobile</span><span className="font-medium">{useNewCustomer ? newCustomer.mobile : selectedCustomer?.mobile}</span></div>
              </div>
              <h3 className="font-medium text-gray-700 border-b pb-2 pt-2">Payment</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold text-indigo-600">{formatCurrency(totalAmount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Advance</span><span className="text-green-600">{formatCurrency(advanceAmount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Pending</span><span className={pendingAmount > 0 ? 'text-red-500 font-semibold' : 'text-green-600'}>{formatCurrency(Math.max(0, pendingAmount))}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Method</span><span>{paymentMethod}</span></div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-between">
            <button className="btn-secondary" onClick={() => setStep(3)}>← Back</button>
            <button
              className="btn-success"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : '✓ Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateBookingPage;
