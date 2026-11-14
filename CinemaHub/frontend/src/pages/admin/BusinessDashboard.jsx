import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Ticket, Film, Users, Tag, Building2,
  Calendar, RefreshCw, Award, Percent, Clock, FileSpreadsheet
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function BusinessDashboard() {
  const getToday = () => new Date().toISOString().split('T')[0];
  const getThirtyDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getThirtyDaysAgo());
  const [endDate, setEndDate] = useState(getToday());
  const [selectedCinema, setSelectedCinema] = useState('ALL');
  const [cinemas, setCinemas] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('CINEMA'); // CINEMA | MOVIE | SHOWTIME

  useEffect(() => {
    fetch(`${API_BASE_URL}/cinemas`)
      .then(res => res.json())
      .then(resData => setCinemas(resData || []))
      .catch(err => console.error('Lỗi tải danh sách rạp:', err));
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        const userStr = localStorage.getItem('user') || localStorage.getItem('auth');
        if (userStr) {
          try {
            const parsed = JSON.parse(userStr);
            token = parsed?.token || parsed?.accessToken || parsed?.jwt;
          } catch (e) {}
        }
      }

      const query = new URLSearchParams({
        startDate,
        endDate,
        cinemaId: selectedCinema
      }).toString();

      const res = await fetch(`${API_BASE_URL}/dashboard/overview?${query}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, selectedCinema]);

  // XUẤT BÁO CÁO KINH DOANH - ĐÃ FIX
  const handleExportBusinessReport = async () => {
    if (!data) {
      alert('Chưa có dữ liệu Dashboard để xuất báo cáo!');
      return;
    }

    setExporting(true);

    try {
      let token =
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken');

      if (!token) {
        const userStr =
          localStorage.getItem('user') ||
          localStorage.getItem('auth');

        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            token =
              user?.token ||
              user?.accessToken ||
              user?.jwt;
          } catch (e) {
            console.error('Lỗi đọc token:', e);
          }
        }
      }

      const query = new URLSearchParams({
        startDate,
        endDate,
        cinemaId: selectedCinema
      }).toString();

      let reportDetails = null;

      // BƯỚC 1: Thử lấy dữ liệu chi tiết từ Backend
      try {
        const res = await fetch(
          `${API_BASE_URL}/reports/business?${query}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {})
            }
          }
        );

        if (res.ok) {
          const reportData = await res.json();

          if (Array.isArray(reportData.details)) {
            reportDetails = reportData.details;
          }
        } else {
          console.warn(
            'API báo cáo không hoạt động:',
            res.status
          );
        }
      } catch (apiError) {
        console.warn(
          'Không kết nối được API báo cáo:',
          apiError
        );
      }

      // BƯỚC 2: Tạo dữ liệu CSV
      let csvRows = [];

      if (reportDetails !== null) {
        // Xuất dữ liệu chi tiết từ Backend
        csvRows.push([
          'Mã Giao Dịch',
          'Khách Hàng',
          'Tên Phim',
          'Cụm Rạp',
          'Số Vé',
          'Doanh Thu Vé',
          'Doanh Số F&B',
          'Tổng Tiền',
          'Thời Gian'
        ]);

        reportDetails.forEach(row => {
          csvRows.push([
            row.bookingReference,
            row.customerName,
            row.movieTitle,
            row.cinemaName,
            row.ticketsCount,
            row.ticketRevenue,
            row.foodRevenue,
            row.totalAmount,
            row.createdAt
          ]);
        });

      } else {
        // API lỗi: sử dụng dữ liệu Dashboard hiện có

        csvRows = [
          ['BÁO CÁO KINH DOANH'],
          ['Từ ngày', startDate],
          ['Đến ngày', endDate],
          [
            'Cụm rạp',
            selectedCinema === 'ALL'
              ? 'Tất cả cụm rạp'
              : selectedCinema
          ],
          [],
          ['THỐNG KÊ TỔNG QUAN'],
          ['Chỉ tiêu', 'Giá trị'],
          ['Tổng doanh thu', data.summary?.totalRevenue || 0],
          ['Doanh thu vé', data.summary?.ticketRevenue || 0],
          ['Doanh thu F&B', data.summary?.foodRevenue || 0],
          ['Số vé bán ra', data.summary?.totalTicketsSold || 0],
          ['Tổng giao dịch', data.summary?.totalBookings || 0],
          [
            'Giá trị đơn hàng trung bình',
            data.summary?.averageOrderValue || 0
          ],
          ['Tỷ lệ lấp đầy (%)', data.overallOccupancyRate || 0],
          [
            'Tổng khách hàng',
            data.customerStats?.totalCustomers || 0
          ],
          [
            'Khách hàng hoạt động',
            data.customerStats?.activeCustomersInPeriod || 0
          ],
          [
            'Tổng điểm thưởng',
            data.customerStats?.totalPointsIssued || 0
          ],
          [],
          ['DOANH THU THEO NGÀY'],
          ['Ngày', 'Doanh thu', 'Số vé', 'Doanh thu F&B']
        ];

        (data.dailyTrends || []).forEach(item => {
          csvRows.push([
            item.date,
            item.revenue,
            item.ticketsSold,
            item.foodRevenue
          ]);
        });

        csvRows.push(
          [],
          ['DOANH THU THEO CỤM RẠP'],
          [
            'Cụm rạp',
            'Số vé',
            'Doanh thu vé',
            'Doanh thu F&B',
            'Tỷ lệ lấp đầy (%)',
            'Tổng doanh thu'
          ]
        );

        (data.revenueByCinema || []).forEach(item => {
          csvRows.push([
            item.cinemaName,
            item.ticketsSold,
            item.ticketRevenue,
            item.foodRevenue,
            item.occupancyRate,
            item.totalRevenue
          ]);
        });

        csvRows.push(
          [],
          ['TOP PHIM BÁN CHẠY'],
          [
            'Tên phim',
            'Số suất chiếu',
            'Số vé',
            'Tỷ lệ lấp đầy (%)',
            'Doanh thu'
          ]
        );

        (data.bestSellingMovies || []).forEach(item => {
          csvRows.push([
            item.title,
            item.showtimeCount,
            item.ticketsSold,
            item.occupancyRate,
            item.revenue
          ]);
        });

        csvRows.push(
          [],
          ['DOANH THU THEO SUẤT CHIẾU'],
          [
            'Tên phim',
            'Cụm rạp',
            'Phòng',
            'Thời gian',
            'Ghế đã bán',
            'Tổng ghế',
            'Tỷ lệ lấp đầy (%)',
            'Doanh thu'
          ]
        );

        (data.revenueByShowtime || []).forEach(item => {
          csvRows.push([
            item.movieTitle,
            item.cinemaName,
            item.roomName,
            item.startTime,
            item.ticketsSold,
            item.totalSeats,
            item.occupancyRate,
            item.revenue
          ]);
        });

        csvRows.push(
          [],
          ['THỐNG KÊ KHÁCH HÀNG'],
          ['Hạng thành viên', 'Số lượng']
        );

        (data.customerStats?.tierDistribution || []).forEach(item => {
          csvRows.push([
            item.tierName,
            item.count
          ]);
        });

        csvRows.push(
          [],
          ['TOP KHÁCH HÀNG CHI TIÊU CAO'],
          [
            'Họ tên',
            'Email',
            'Hạng',
            'Tổng chi tiêu',
            'Số giao dịch'
          ]
        );

        (data.customerStats?.topCustomers || []).forEach(item => {
          csvRows.push([
            item.fullName,
            item.email,
            item.tier,
            item.totalSpent,
            item.bookingCount
          ]);
        });

        csvRows.push(
          [],
          ['HIỆU QUẢ KHUYẾN MÃI'],
          [
            'Mã khuyến mãi',
            'Mô tả',
            'Lượt sử dụng',
            'Tổng chiết khấu',
            'Doanh thu mang lại'
          ]
        );

        (data.promotionPerformance || []).forEach(item => {
          csvRows.push([
            item.promoCode,
            item.description,
            item.usageCount,
            item.totalDiscountGiven,
            item.generatedRevenue
          ]);
        });
      }

      // BƯỚC 3: Chuyển dữ liệu thành CSV
      const escapeCSV = (value) => {
        if (value === null || value === undefined) {
          return '""';
        }

        const text = String(value);
        return `"${text.replace(/"/g, '""')}"`;
      };

      const csvContent =
        '\uFEFF' +
        csvRows
          .map(row => row.map(escapeCSV).join(','))
          .join('\r\n');

      // BƯỚC 4: Tạo và tải file
      const blob = new Blob(
        [csvContent],
        { type: 'text/csv;charset=utf-8;' }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download =
        `Bao_Cao_Kinh_Doanh_${startDate}_den_${endDate}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      alert(
        reportDetails !== null
          ? 'Xuất báo cáo chi tiết thành công!'
          : 'Xuất báo cáo thống kê Dashboard thành công!'
      );

    } catch (error) {
      console.error('Lỗi xuất báo cáo:', error);
      alert('Không thể tạo file báo cáo: ' + error.message);

    } finally {
      setExporting(false);
    }
  };
  const formatVND = (val) => `${Math.round(val || 0).toLocaleString('vi-VN')} đ`;

  const maxDailyRevenue = data?.dailyTrends?.length
    ? Math.max(...data.dailyTrends.map(d => d.revenue), 1)
    : 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER & FILTER BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full">
                Executive Analytics
              </span>
              {/* Nút Xuất Báo Cáo (Generate Business Reports) */}
              <button
                onClick={handleExportBusinessReport}
                disabled={exporting}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                title="Tạo và xuất báo cáo kinh doanh"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {exporting ? 'Đang xuất...' : 'Xuất Báo Cáo (CSV)'}
              </button>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold mt-2">
              Bảng Điều Khiển Hoạt Động Kinh Doanh
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Theo dõi doanh thu vé, F&B, tỷ lệ lấp đầy ghế, khách hàng thân thiết và hiệu quả khuyến mãi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-[#141414] p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-red-500"
              />
              <span className="text-gray-500 text-xs">đến</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-red-500"
              />
            </div>

            <select
              value={selectedCinema}
              onChange={(e) => setSelectedCinema(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
            >
              <option value="ALL">Tất cả cụm rạp</option>
              {cinemas.map(c => (
                <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
              ))}
            </select>

            <button
              onClick={fetchDashboardData}
              className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="text-center py-20 text-gray-400">Đang tổng hợp dữ liệu kinh doanh...</div>
        ) : data && (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                  <span>TỔNG DOANH THU</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white mt-3">
                  {formatVND(data.summary.totalRevenue)}
                </div>
                <div className="text-xs text-gray-400 mt-2 flex justify-between">
                  <span>Vé: {formatVND(data.summary.ticketRevenue)}</span>
                  <span className="text-amber-400">F&B: {formatVND(data.summary.foodRevenue)}</span>
                </div>
              </div>

              <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                  <span>SỐ LƯỢNG VÉ BÁN RA</span>
                  <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                    <Ticket className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white mt-3">
                  {data.summary.totalTicketsSold.toLocaleString('vi-VN')} <span className="text-sm font-normal text-gray-400">vé</span>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Từ <strong className="text-white">{data.summary.totalBookings}</strong> giao dịch thành công
                </div>
              </div>

              <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                  <span>TỶ LỆ LẤP ĐẦY GHẾ</span>
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                    <Percent className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white mt-3">
                  {data.overallOccupancyRate}%
                </div>
                <div className="w-full bg-neutral-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, data.overallOccupancyRate)}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                  <span>KHÁCH HÀNG & ĐIỂM THƯỞNG</span>
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white mt-3">
                  {data.customerStats.totalCustomers.toLocaleString('vi-VN')} <span className="text-sm font-normal text-gray-400">thành viên</span>
                </div>
                <div className="text-xs text-gray-400 mt-2 flex justify-between">
                  <span>Hoạt động: {data.customerStats.activeCustomersInPeriod}</span>
                  <span className="text-blue-400">{data.customerStats.totalPointsIssued.toLocaleString()} điểm</span>
                </div>
              </div>
            </div>

            {/* BIỂU ĐỒ XU HƯỚNG DOANH THU */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-red-500" />
                    Biểu Đồ Doanh Thu & Sản Lượng Vé Theo Ngày
                  </h2>
                  <p className="text-xs text-gray-400">Tổng hợp doanh thu vé và doanh số F&B theo từng ngày trong kỳ</p>
                </div>
                <div className="text-xs text-gray-400">
                  Giá trị đơn TB: <span className="text-white font-bold">{formatVND(data.summary.averageOrderValue)}</span>
                </div>
              </div>

              {data.dailyTrends.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-10">Chưa có giao dịch trong khoảng thời gian này.</p>
              ) : (
                <div className="flex items-end gap-2 h-52 pt-6 overflow-x-auto pb-2">
                  {data.dailyTrends.map(day => {
                    const heightPct = Math.max(8, Math.round((day.revenue / maxDailyRevenue) * 100));
                    return (
                      <div key={day.date} className="flex-1 min-w-[44px] flex flex-col items-center group relative">
                        <div className="opacity-0 group-hover:opacity-100 transition bg-neutral-800 border border-neutral-700 text-[10px] px-2 py-1 rounded mb-1 whitespace-nowrap absolute bottom-full z-20 shadow-lg">
                          <div className="font-bold text-emerald-400">{formatVND(day.revenue)}</div>
                          <div className="text-gray-300">{day.ticketsSold} vé • F&B: {formatVND(day.foodRevenue)}</div>
                        </div>
                        <div
                          className="w-full max-w-[32px] bg-gradient-to-t from-red-700 to-red-500 rounded-t-md hover:from-amber-600 hover:to-amber-400 transition-all cursor-pointer"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[10px] text-gray-500 mt-2">
                          {day.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PHÂN TÍCH ĐA CHIỀU & TOP PHIM */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#141414] border border-white/10 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <h2 className="text-lg font-bold">Phân Tích Doanh Thu & Tỷ Lệ Lấp Đầy</h2>
                  <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs font-semibold">
                    <button
                      onClick={() => setActiveAnalysisTab('CINEMA')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${activeAnalysisTab === 'CINEMA' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <Building2 className="w-3.5 h-3.5" /> Theo Rạp
                    </button>
                    <button
                      onClick={() => setActiveAnalysisTab('MOVIE')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${activeAnalysisTab === 'MOVIE' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <Film className="w-3.5 h-3.5" /> Theo Phim
                    </button>
                    <button
                      onClick={() => setActiveAnalysisTab('SHOWTIME')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${activeAnalysisTab === 'SHOWTIME' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <Clock className="w-3.5 h-3.5" /> Theo Suất Chiếu
                    </button>
                  </div>
                </div>

                {activeAnalysisTab === 'CINEMA' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-white/10 uppercase">
                          <th className="py-3">Cụm Rạp</th>
                          <th className="py-3 text-right">Vé Bán</th>
                          <th className="py-3 text-right">Doanh Thu Vé</th>
                          <th className="py-3 text-right">Doanh Số F&B</th>
                          <th className="py-3 text-right">Lấp Đầy</th>
                          <th className="py-3 text-right">Tổng Cộng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.revenueByCinema.map(c => (
                          <tr key={c.cinemaId} className="hover:bg-white/5">
                            <td className="py-3 font-semibold">{c.cinemaName}</td>
                            <td className="py-3 text-right">{c.ticketsSold}</td>
                            <td className="py-3 text-right text-gray-300">{formatVND(c.ticketRevenue)}</td>
                            <td className="py-3 text-right text-amber-400">{formatVND(c.foodRevenue)}</td>
                            <td className="py-3 text-right text-purple-400 font-semibold">{c.occupancyRate}%</td>
                            <td className="py-3 text-right font-bold text-emerald-400">{formatVND(c.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeAnalysisTab === 'MOVIE' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-white/10 uppercase">
                          <th className="py-3">Tên Phim</th>
                          <th className="py-3 text-right">Suất Chiếu</th>
                          <th className="py-3 text-right">Số Vé</th>
                          <th className="py-3 text-right">Tỷ Lệ Lấp Đầy</th>
                          <th className="py-3 text-right">Doanh Thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.bestSellingMovies.map(m => (
                          <tr key={m.movieId} className="hover:bg-white/5">
                            <td className="py-3 font-semibold">{m.title}</td>
                            <td className="py-3 text-right text-gray-400">{m.showtimeCount}</td>
                            <td className="py-3 text-right font-bold">{m.ticketsSold}</td>
                            <td className="py-3 text-right text-purple-400">{m.occupancyRate}%</td>
                            <td className="py-3 text-right font-bold text-emerald-400">{formatVND(m.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeAnalysisTab === 'SHOWTIME' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-white/10 uppercase">
                          <th className="py-3">Phim / Phòng</th>
                          <th className="py-3">Giờ Chiếu</th>
                          <th className="py-3 text-right">Ghế Đã Bán</th>
                          <th className="py-3 text-right">Lấp Đầy</th>
                          <th className="py-3 text-right">Doanh Thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.revenueByShowtime.map(s => (
                          <tr key={s.showtimeId} className="hover:bg-white/5">
                            <td className="py-3">
                              <div className="font-semibold">{s.movieTitle}</div>
                              <div className="text-xs text-gray-400">{s.cinemaName} • {s.roomName}</div>
                            </td>
                            <td className="py-3 text-xs text-gray-300">
                              {s.startTime ? new Date(s.startTime).toLocaleString('vi-VN') : '-'}
                            </td>
                            <td className="py-3 text-right">{s.ticketsSold}/{s.totalSeats}</td>
                            <td className="py-3 text-right text-purple-400 font-semibold">{s.occupancyRate}%</td>
                            <td className="py-3 text-right font-bold text-emerald-400">{formatVND(s.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* TOP PHIM BÁN CHẠY NHẤT */}
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Film className="w-5 h-5 text-amber-500" />
                  Top Phim Bán Chạy Nhất
                </h2>
                <div className="space-y-4">
                  {data.bestSellingMovies.slice(0, 5).map((movie, idx) => (
                    <div key={movie.movieId} className="flex items-center gap-3 bg-neutral-900/70 p-3 rounded-xl border border-white/5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        idx === 0 ? 'bg-amber-500 text-black' :
                        idx === 1 ? 'bg-gray-300 text-black' :
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-neutral-800 text-gray-400'
                      }`}>
                        #{idx + 1}
                      </div>
                      {movie.posterUrl && (
                        <img src={movie.posterUrl} alt={movie.title} className="w-10 h-14 object-cover rounded-md shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{movie.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          <span className="text-white font-semibold">{movie.ticketsSold}</span> vé • Lấp đầy {movie.occupancyRate}%
                        </div>
                        <div className="text-xs font-bold text-emerald-400 mt-0.5">
                          {formatVND(movie.revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* THỐNG KÊ KHÁCH HÀNG & HIỆU QUẢ KHUYẾN MÃI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-400" />
                  Thống Kê Khách Hàng & Chương Trình Thân Thiết
                </h2>

                <div>
                  <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Phân Bổ Hạng Thành Viên</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {data.customerStats.tierDistribution.map(t => (
                      <div key={t.tierName} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl">
                        <div className="text-xs font-bold text-blue-400">{t.tierName}</div>
                        <div className="text-xl font-black mt-1">{t.count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Top Khách Hàng Chi Tiêu Cao</div>
                  <div className="space-y-2">
                    {data.customerStats.topCustomers.map(cust => (
                      <div key={cust.userId} className="flex items-center justify-between bg-neutral-900/60 px-3 py-2.5 rounded-xl text-sm">
                        <div>
                          <div className="font-semibold">{cust.fullName}</div>
                          <div className="text-xs text-gray-400">{cust.email} • Hạng {cust.tier}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-400">{formatVND(cust.totalSpent)}</div>
                          <div className="text-xs text-gray-400">{cust.bookingCount} đơn</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5 text-pink-500" />
                  Hiệu Quả Chương Trình Khuyến Mãi
                </h2>

                {data.promotionPerformance.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-12">Chưa có mã khuyến mãi nào được sử dụng trong kỳ.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-white/10 uppercase">
                          <th className="py-3">Mã Code</th>
                          <th className="py-3 text-right">Lượt Dùng</th>
                          <th className="py-3 text-right">Tổng Chiết Khấu</th>
                          <th className="py-3 text-right">Doanh Thu Mang Lại</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.promotionPerformance.map(promo => (
                          <tr key={promo.promoCode} className="hover:bg-white/5">
                            <td className="py-3">
                              <span className="font-mono font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">
                                {promo.promoCode}
                              </span>
                              <div className="text-xs text-gray-400 mt-1">{promo.description}</div>
                            </td>
                            <td className="py-3 text-right font-bold">{promo.usageCount}</td>
                            <td className="py-3 text-right text-amber-400">-{formatVND(promo.totalDiscountGiven)}</td>
                            <td className="py-3 text-right font-bold text-emerald-400">{formatVND(promo.generatedRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}