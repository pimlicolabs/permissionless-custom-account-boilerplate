import { getSenderAddress } from "permissionless/_types/actions"
import type {
    ENTRYPOINT_ADDRESS_V06_TYPE,
    EntryPoint
} from "permissionless/types"
import {
    type Address,
    type Chain,
    type Client,
    type Transport,
    concatHex
} from "viem"
import { getFactoryData } from "./getFactoryData"

export const getAccountAddress = async <
    entryPoint extends EntryPoint,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        factoryAddress,
        entryPoint: entryPointAddress,
        owner,
        index = 0n
    }: {
        factoryAddress: Address
        owner: Address
        entryPoint: entryPoint
        index?: bigint
    }
): Promise<Address> => {
    const factoryData = await getFactoryData({
        account: { address: owner, type: "json-rpc" },
        index
    })

    return getSenderAddress(client, {
        initCode: concatHex([factoryAddress, factoryData]),
        entryPoint: entryPointAddress as ENTRYPOINT_ADDRESS_V06_TYPE
    })
}
