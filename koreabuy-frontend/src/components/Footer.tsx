// components/Footer.tsx

export default function Footer() {
  return (
    <>
      <div style={{ margin: "60px 0", textAlign: "center" }}>
        <div
          style={{
            height: 1,
            background: "#eee",
            position: "relative",
          }}
        >
        </div>
      </div>
      <div className="site-footer">
        <div className="container">
          <div className="row justify-content-between">
            <div className="col-lg-5">
              <div className="widget mb-4">
                <h3 className="mb-2">Kbuy</h3>
                <p>
                  Kbuy giúp bạn mua hàng trực tiếp từ các thương hiệu nổi tiếng
                  Hàn Quốc như Olive Young, Coupang, Gmarket,... với giá tốt
                </p>
              </div>

              <div className="widget">
                <h3>Tham gia với chúng tôi để nhận thông tin và ưu đã mới</h3>

                <form className="subscribe">
                  <div className="d-flex">
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Email address"
                    />
                    <input
                      type="submit"
                      className="btn btn-black"
                      value="Subscribe"
                    />
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="row mt-5">
            <div className="col-12 text-center">
              <ul className="list-unstyled social">
                <li>
                  <a href="#">
                    <span className="icon-facebook"></span>
                  </a>
                </li>
                <li>
                  <a href="#">
                    <span className="icon-instagram"></span>
                  </a>
                </li>
                <li>
                  <a href="#">
                    <span className="icon-linkedin"></span>
                  </a>
                </li>
                <li>
                  <a href="#">
                    <span className="icon-twitter"></span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-12 text-center copyright">
              <p>
                Copyright &copy; {new Date().getFullYear()}. — Designed by{" "}
                <a href="https://untree.co">Untree.co</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
