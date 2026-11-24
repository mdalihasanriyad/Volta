export const validate = (schema, source = 'body') => (req, res, next) => {
  const parsed = schema.parse(req[source]) // ZodError is turned into a 400 by errorHandler
  if (source === 'query') { Object.keys(req.query).forEach((k) => delete req.query[k]); Object.assign(req.query, parsed) } else req[source] = parsed
  next()
}
