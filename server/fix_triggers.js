const { getPool, closeAll } = require('./db/connections');

const q1 = `
ALTER TRIGGER TRG_TichDiemSauKhiDat
ON PhieuDat
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @MaKH VARCHAR(10), @TongTien DECIMAL(18, 2), @DiemCong DECIMAL(10, 2);

    -- Lấy dữ liệu từ bảng inserted 
    SELECT @MaKH = MaKH, @TongTien = TongTien FROM inserted;

    SET @DiemCong = ISNULL(@TongTien, 0) / 100000.0;

    IF @DiemCong > 0 AND @MaKH IS NOT NULL
    BEGIN
        UPDATE KhachHang
        SET TheTichDiem = ISNULL(TheTichDiem, 0) + @DiemCong
        WHERE MaKH = @MaKH;
        
        PRINT N'Hệ thống: Đã tích ' + CAST(@DiemCong AS NVARCHAR(10)) + N' điểm cho khách ' + @MaKH;
    END
END;
`;

const q2 = `
ALTER TRIGGER TRG_CheckKhachHang_LienVung
ON PhieuDat
INSTEAD OF INSERT
AS
BEGIN
    DECLARE @MaKH VARCHAR(10), @MaKS VARCHAR(10), @MaPhieu VARCHAR(10), 
            @NgayDen DATE, @NgayDi DATE, @TrangThai NVARCHAR(50), @TongTien DECIMAL(18,2);
            
    SELECT @MaKH = MaKH, @MaKS = MaKS, @MaPhieu = MaPhieu, 
           @NgayDen = NgayDen, @NgayDi = NgayDi, @TrangThai = TrangThai,
           @TongTien = TongTien
    FROM inserted;

    -- 1. Nếu khách chưa có, thử chép từ Miền Trung hoặc Nam
    IF NOT EXISTS (SELECT 1 FROM KhachHang WHERE MaKH = @MaKH)
    BEGIN
        -- Thử chép từ Miền Trung
        INSERT INTO KhachHang (MaKH, Passport, CreditCard, TheTichDiem, MaCN)
        SELECT MaKH, Passport, CreditCard, TheTichDiem, MaCN 
        FROM [PHONG\\MIENTRUNG].[GRANDVN_CENTRAL].dbo.KhachHang 
        WHERE MaKH = @MaKH;

        -- Nếu vẫn chưa có, thử chép từ Miền Nam
        IF @@ROWCOUNT = 0
        BEGIN
            INSERT INTO KhachHang (MaKH, Passport, CreditCard, TheTichDiem, MaCN)
            SELECT MaKH, Passport, CreditCard, TheTichDiem, MaCN 
            FROM [PHONG\\MIENNAM].[GRANDVN_SOUTH].dbo.KhachHang 
            WHERE MaKH = @MaKH;
        END
    END

    -- 2. Đảm bảo khách có
    IF EXISTS (SELECT 1 FROM KhachHang WHERE MaKH = @MaKH)
    BEGIN
        INSERT INTO PhieuDat (MaPhieu, NgayDen, NgayDi, TongTien, TrangThai, MaKH, MaKS)
        VALUES (@MaPhieu, @NgayDen, @NgayDi, @TongTien, @TrangThai, @MaKH, @MaKS);
        
        PRINT N'Thành công: Đã đồng bộ khách hàng và tạo phiếu đặt ' + @MaPhieu;
    END
    ELSE
    BEGIN
        RAISERROR(N'Lỗi: Khách hàng không tồn tại trên toàn hệ thống!', 16, 1);
    END
END;
`;

async function fixTriggers() {
  const regions = ['north', 'central', 'south'];
  for (const reg of regions) {
    try {
      console.log(`Fixing ${reg}...`);
      const pool = await getPool(reg);
      
      try {
        await pool.request().query(q1);
        console.log(`TRG_TichDiemSauKhiDat fixed on ${reg}`);
      } catch (e1) {
        console.warn(`q1 skipped on ${reg}:`, e1.message);
      }
      
      try {
        await pool.request().query(q2);
        console.log(`TRG_CheckKhachHang_LienVung fixed on ${reg}`);
      } catch (e2) {
        console.warn(`q2 skipped on ${reg}:`, e2.message);
      }

    } catch (err) {
      console.error(`Error on ${reg}:`, err.message);
    }
  }
  await closeAll();
}

fixTriggers();
