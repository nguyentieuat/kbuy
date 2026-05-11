// components/Features.tsx

type Feature = {
  title: string
  desc: string
  icon: React.ReactNode
}

const features: Feature[] = [
  {
    title: "Worldwide Delivery",
    desc: "Far far away, behind the word mountains.",
    icon: "🚚"
  },
  {
    title: "Secure Payments",
    desc: "Safe and protected transactions.",
    icon: "🔒"
  },
  {
    title: "Simple Returns",
    desc: "Easy return process.",
    icon: "🔄"
  }
]

export default function Features() {
  return (
    <div className="untree_co-section bg-light">
      <div className="container">
        <div className="row align-items-stretch">
          {features.map((f, i) => (
            <div className="col-md-4" key={i}>
              <div className="feature h-100">
                <div className="icon mb-4">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}