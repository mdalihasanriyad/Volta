export default function PageLoader() {
  return (
    <div className="container-x py-24" aria-busy="true">
      <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
      </div>
    </div>
  )
}
