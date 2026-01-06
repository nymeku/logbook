import { useCustomers } from "../api/get-customers";

const CustomersList = () => {
  const customersQuery = useCustomers();
  const customers = customersQuery.data?.pages.flatMap((page) => page.data);

  if (customersQuery.isLoading) {
    return <div>Loading...</div>;
  }

  if (customersQuery.isError) {
    return <div>Error: {customersQuery.error.message}</div>;
  }

  return (
    <div>
      {customers?.map((customer) => (
        <div key={customer.id}>{customer.email}</div>
      ))}
      {customersQuery.hasNextPage && (
        <button onClick={() => customersQuery.fetchNextPage()}>
          {customersQuery.isFetchingNextPage ? "Loading more..." : "Load more"}
        </button>
      )}
    </div>
  );
};

export default CustomersList;
