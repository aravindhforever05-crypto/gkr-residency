import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsAPI } from '../api';
import { Room, RoomStatus } from '../types';
import { getRoomStatusConfig, formatCurrency } from '../utils';
import { LoadingPage, Modal, Badge } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Filter } from 'lucide-react';

const ROOM_STATUSES: RoomStatus[] = ['AVAILABLE', 'BOOKED', 'OCCUPIED', 'CHECK_IN_TODAY', 'CHECK_OUT_TODAY', 'CLEANING', 'MAINTENANCE', 'BLOCKED'];

const RoomCard: React.FC<{ room: Room; onStatusChange: (room: Room) => void; onClick: () => void }> = ({ room, onStatusChange, onClick }) => {
  const cfg = getRoomStatusConfig(room.status);

  return (
    <div
      className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
        room.status === 'AVAILABLE' ? 'border-green-200 bg-green-50' :
        room.status === 'BOOKED' ? 'border-blue-200 bg-blue-50' :
        room.status === 'OCCUPIED' ? 'border-orange-200 bg-orange-50' :
        room.status === 'CLEANING' ? 'border-yellow-200 bg-yellow-50' :
        room.status === 'MAINTENANCE' ? 'border-red-200 bg-red-50' :
        room.status === 'CHECK_IN_TODAY' ? 'border-cyan-200 bg-cyan-50' :
        room.status === 'CHECK_OUT_TODAY' ? 'border-purple-200 bg-purple-50' :
        'border-gray-200 bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl font-bold text-gray-900">{room.room_number}</span>
        <div className={`w-3 h-3 rounded-full ${cfg.dot} mt-1`} />
      </div>
      <p className={`text-xs font-semibold ${cfg.text} mb-1`}>{cfg.label}</p>
      <p className="text-xs text-gray-500">{room.room_type}</p>
      <p className="text-sm font-medium text-gray-700 mt-1">{formatCurrency(room.base_price)}<span className="text-xs text-gray-400">/night</span></p>
      {room.current_booking && (
        <p className="text-xs text-gray-500 mt-1 truncate">{room.current_booking.customer_name}</p>
      )}
      <button
        className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
        onClick={e => { e.stopPropagation(); onStatusChange(room); }}
      >
        Change status
      </button>
    </div>
  );
};

const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [statusModal, setStatusModal] = useState<Room | null>(null);
  const [newStatus, setNewStatus] = useState<RoomStatus>('AVAILABLE');
  const [reason, setReason] = useState('');

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms', selectedFloor],
    queryFn: () => roomsAPI.getAll(selectedFloor ? { floor: selectedFloor } : {}).then(r => r.data.data as Room[]),
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => roomsAPI.getFloors().then(r => r.data.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      roomsAPI.updateStatus(id, status, reason),
    onSuccess: () => {
      toast.success('Room status updated');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setStatusModal(null);
      setReason('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const floorGroups = rooms.reduce<Record<number, Room[]>>((acc, room) => {
    const f = room.floor_number;
    if (!acc[f]) acc[f] = [];
    acc[f].push(room);
    return acc;
  }, {});

  const statusCounts = rooms.reduce<Record<string, number>>((acc, room) => {
    acc[room.status] = (acc[room.status] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) return <LoadingPage />;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(statusCounts).map(([status, count]) => {
          const cfg = getRoomStatusConfig(status as RoomStatus);
          return (
            <div key={status} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${cfg.bg} ${cfg.text}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {count} {cfg.label}
            </div>
          );
        })}
      </div>

      {/* Floor filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedFloor === null ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          onClick={() => setSelectedFloor(null)}
        >
          All Floors
        </button>
        {floors.map((f: any) => (
          <button
            key={f.floor_number}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedFloor === f.floor_number ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setSelectedFloor(f.floor_number)}
          >
            Floor {f.floor_number}
          </button>
        ))}
      </div>

      {/* Floors and rooms */}
      {Object.entries(floorGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([floor, floorRooms]) => (
        <div key={floor}>
          <h2 className="font-semibold text-gray-900 text-lg mb-3 flex items-center gap-2">
            <span className="bg-slate-900 text-white text-sm px-2.5 py-0.5 rounded-lg">Floor {floor}</span>
            <span className="text-sm text-gray-500 font-normal">{floorRooms.length} rooms</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {floorRooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                onStatusChange={r => { setStatusModal(r); setNewStatus(r.status); }}
                onClick={() => navigate(`/rooms/${room.id}`)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Legend</p>
        <div className="flex flex-wrap gap-3">
          {ROOM_STATUSES.map(status => {
            const cfg = getRoomStatusConfig(status);
            return (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-gray-600">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status change modal */}
      <Modal
        isOpen={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={`Update Room ${statusModal?.room_number} Status`}
      >
        <div className="space-y-4">
          <div>
            <label className="label">New Status</label>
            <select
              className="select"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as RoomStatus)}
            >
              {ROOM_STATUSES.map(s => (
                <option key={s} value={s}>{getRoomStatusConfig(s).label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Reason (optional)</label>
            <input
              className="input"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why are you changing the status?"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={() => statusModal && updateStatusMutation.mutate({ id: statusModal.id, status: newStatus, reason })}
              disabled={updateStatusMutation.isPending}
            >
              Update Status
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RoomsPage;
