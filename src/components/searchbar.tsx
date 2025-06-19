import SearchIcon from '@mui/icons-material/Search';
import { Box, TextField } from '@mui/material';

const SearchBar = ({ search, setSearch }: { search: string; setSearch: (val: string) => void }) => {
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <SearchIcon color="action" />
      <TextField
        placeholder="Search users"
        variant="standard"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
      />
    </Box>
  );
};

export default SearchBar;
