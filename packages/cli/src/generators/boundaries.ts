export function generateBoundariesMarkdown(): string {
  return `# Threadline Boundaries

Threadline keeps generated UI work inside presentation code. Move data fetching,
routing mutations, global state, and browser persistence behind explicit handoffs.

## Forbidden imports

- fetch
- axios
- useSWR
- useQuery
- useDispatch
- useSelector
- useNavigate
- localStorage
- sessionStorage

## Forbidden paths

- src/api/
- src/store/
- src/hooks/useAuth*
- src/services/

## Whitelisted component areas

- src/providers/**
- src/layouts/**
`;
}
