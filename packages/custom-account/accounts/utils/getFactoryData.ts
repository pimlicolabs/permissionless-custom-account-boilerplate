import type { Account } from "viem"
import { encodeFunctionData } from "viem"

/**
 * Wrapped this function to minimize the call to check if account is deployed
 */
export const getFactoryData = async ({
    account,
    index
}: {
    account: Account
    index: bigint
}) => {
    if (!account.address) throw new Error("Owner account not found")

    return encodeFunctionData({
        abi: [
            {
                inputs: [
                    {
                        internalType: "address",
                        name: "owner",
                        type: "address"
                    },
                    {
                        internalType: "uint256",
                        name: "salt",
                        type: "uint256"
                    }
                ],
                name: "createAccount",
                outputs: [
                    {
                        internalType: "contract CustomAccount",
                        name: "ret",
                        type: "address"
                    }
                ],
                stateMutability: "nonpayable",
                type: "function"
            }
        ],
        functionName: "createAccount",
        args: [account.address, index]
    })
}
