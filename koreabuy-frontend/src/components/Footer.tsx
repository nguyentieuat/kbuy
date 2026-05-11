// components/Footer.tsx

export default function Footer() {
  return (
    <div className="site-footer">
      <div className="container">
        <div className="row justify-content-between">

          <div className="col-lg-5">
            <div className="widget mb-4">
              <h3 className="mb-2">About UntreeStore</h3>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Voluptate modi cumque rem recusandae quaerat at asperiores
                beatae saepe.
              </p>
            </div>

            <div className="widget">
              <h3>Join our mailing list and receive exclusives</h3>

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

          <div className="col-lg-2">
            <div className="widget">
              <h3>Help</h3>
              <ul className="list-unstyled">
                <li><a href="#">Contact us</a></li>
                <li><a href="#">Account</a></li>
                <li><a href="#">Shipping</a></li>
                <li><a href="#">Returns</a></li>
                <li><a href="#">FAQ</a></li>
              </ul>
            </div>
          </div>

          <div className="col-lg-2">
            <div className="widget">
              <h3>About</h3>
              <ul className="list-unstyled">
                <li><a href="#">About us</a></li>
                <li><a href="#">Press</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Team</a></li>
                <li><a href="#">FAQ</a></li>
              </ul>
            </div>
          </div>

          <div className="col-lg-2">
            <div className="widget">
              <h3>Shop</h3>
              <ul className="list-unstyled">
                <li><a href="#">Store</a></li>
                <li><a href="#">Gift Cards</a></li>
                <li><a href="#">Student Discount</a></li>
              </ul>
            </div>
          </div>

        </div>

        <div className="row mt-5">
          <div className="col-12 text-center">
            <ul className="list-unstyled social">
              <li><a href="#"><span className="icon-facebook"></span></a></li>
              <li><a href="#"><span className="icon-instagram"></span></a></li>
              <li><a href="#"><span className="icon-linkedin"></span></a></li>
              <li><a href="#"><span className="icon-twitter"></span></a></li>
            </ul>
          </div>

          <div className="col-12 text-center copyright">
            <p>
              Copyright &copy; {new Date().getFullYear()}.
              All Rights Reserved — Designed with love by{" "}
              <a href="https://untree.co">Untree.co</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}