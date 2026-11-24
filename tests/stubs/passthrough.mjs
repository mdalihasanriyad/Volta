export default function passthrough() { return (req, res, next) => next && next() }
