import { Link } from 'react-router-dom'

export default function EmptyState({ icon: Icon, title, text, cta, to, level = 'h2' }) {
  const Heading = level
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      {Icon && <Icon className="mx-auto mb-4 text-gray-300" size={48} strokeWidth={1.25} />}
      <Heading className="text-xl font-bold">{title}</Heading>
      <p className="mt-2 text-gray-500">{text}</p>
      {cta && <Link to={to} className="btn-primary mt-6">{cta}</Link>}
    </div>
  )
}
